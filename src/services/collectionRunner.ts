import { JSONPath } from 'jsonpath-plus';
import { executeRequest } from './networkService';
import { evaluateAssertions } from './assertionEngine';
import {
  createCollectionRun,
  insertCollectionRunStep,
  updateCollectionRun,
  getAssertions,
  getVariableExtractions,
} from './dataService';
import type { Request } from '../types/database';
import type { CollectionRunStep, RunStatus, RunnerStepState } from '../types/runner';
import type { AssertionSummary } from '../types/assertions';

export interface RunCollectionOptions {
  collectionId: string;
  requests: Request[]; // pre-sorted requests
  environmentId: string | null;
  baseVariables: Record<string, string>;
  onProgress?: (stepIndex: number, state: RunnerStepState) => void;
  signal?: AbortSignal;
}

export async function runCollection({
  collectionId,
  requests,
  environmentId,
  baseVariables,
  onProgress,
  signal,
}: RunCollectionOptions) {
  if (requests.length === 0) {
    throw new Error('Collection has no requests to run.');
  }

  // 1. Create Run Record
  const run = await createCollectionRun(collectionId, environmentId, requests.length);
  if (!run) {
    throw new Error('Failed to create collection run in database.');
  }

  const runId = run.id;
  const transientVariables: Record<string, string> = { ...baseVariables };
  let passedSteps = 0;
  let failedSteps = 0;
  const startTime = Date.now();

  // 2. Execute Steps Sequentially
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];

    if (signal?.aborted) {
      await updateCollectionRun(runId, { status: 'cancelled', total_duration: Date.now() - startTime });
      return;
    }

    // Report starting status
    onProgress?.(i, { request, status: 'running' });

    try {
      // Fetch assertions & extractions specifically for this request
      const assertions = await getAssertions(request.id);
      const extractions = await getVariableExtractions(request.id);

      // Execute request with merged variables
      const response = await executeRequest(
        {
          method: request.method as any,
          url: request.url,
          headers: request.headers as any,
          queryParams: request.query_params as any,
          bodyType: request.body_type as any,
          body: request.body as any,
        },
        transientVariables,
        signal,
        30000
      );

      // Evaluate Assertions
      let summary: AssertionSummary | null = null;
      if (assertions.length > 0) {
        summary = evaluateAssertions(
          response,
          assertions.map((a) => ({
            id: a.id,
            field: a.field,
            operator: a.operator,
            expected_value: a.expected_value ?? '',
            enabled: true,
          }))
        );
      }
      const isPassed = summary ? summary.passed : response.status >= 200 && response.status < 300;

      // Extract Variables
      const stepExtractions: Record<string, string> = {};
      if (extractions.length > 0 && response.body) {
        let parsedBody: any;
        try {
          parsedBody = JSON.parse(response.body);
          for (const ext of extractions) {
            try {
              const result = JSONPath({ path: ext.json_path, json: parsedBody });
              if (result && result.length > 0) {
                const val = typeof result[0] === 'string' ? result[0] : JSON.stringify(result[0]);
                transientVariables[ext.variable_name] = val;
                stepExtractions[ext.variable_name] = val;
              }
            } catch (err) {
              console.error('JSONPath extraction failed for', ext.variable_name, err);
            }
          }
        } catch (e) {
          console.error('Failed to parse response body for extraction');
        }
      }

      // Record Step Result
      const stepResult: Omit<CollectionRunStep, 'id' | 'executed_at'> = {
        run_id: runId,
        request_id: request.id,
        step_order: i,
        status_code: response.status,
        latency_ms: response.totalTime,
        response_body: response.body,
        assertion_passed: summary?.passed ?? null,
        assertion_failures: summary?.failures ?? [],
        extracted_variables: stepExtractions,
        error: (response as any).error || null,
      };

      await insertCollectionRunStep(stepResult);

      if (isPassed) {
        passedSteps++;
      } else {
        failedSteps++;
      }

      // Report completion
      onProgress?.(i, { request, status: isPassed ? 'passed' : 'failed', result: stepResult });
    } catch (err) {
      // Hard failure (e.g., network error, invalid URL)
      failedSteps++;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      const errorStep: Omit<CollectionRunStep, 'id' | 'executed_at'> = {
        run_id: runId,
        request_id: request.id,
        step_order: i,
        status_code: null,
        latency_ms: null,
        response_body: null,
        assertion_passed: false,
        assertion_failures: [errorMessage],
        extracted_variables: {},
        error: errorMessage,
      };

      await insertCollectionRunStep(errorStep);
      onProgress?.(i, { request, status: 'failed', result: errorStep });
    }

    // Add a short delay to prevent 429 Too Many Requests on free APIs
    if (i < requests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 3. Finalize Run
  const totalDuration = Date.now() - startTime;
  await updateCollectionRun(runId, {
    passed_steps: passedSteps,
    failed_steps: failedSteps,
    total_duration: totalDuration,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
}
