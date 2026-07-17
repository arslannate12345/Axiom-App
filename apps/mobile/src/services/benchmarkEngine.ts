import { executeRequest, RequestError } from './networkService';
import {
  createBenchmarkRun,
  insertBenchmarkIterations,
  updateBenchmarkRunStats,
} from './dataService';
import { evaluateAssertions } from './assertionEngine';
import type { Request, BenchmarkIteration } from '../types/database';
import type { AssertionRow } from '../types/assertions';

export interface BenchmarkProgress {
  total: number;
  completed: number;
  currentBatch: number;
}

export interface BenchmarkRunOptions {
  request: Request;
  variables: Record<string, string>;
  mode: 'fixed' | 'ramp' | 'spike' | 'soak';
  totalIterations?: number; // Used in fixed, spike
  batchSize?: number; // Used in fixed, soak
  durationMs?: number; // Used in ramp, soak
  startBatchSize?: number; // Used in ramp
  endBatchSize?: number; // Used in ramp
  baseBatchSize?: number; // Used in spike
  spikeBatchSize?: number; // Used in spike
  spikeTimeMs?: number; // Used in spike
  assertions?: AssertionRow[];
  onProgress?: (progress: BenchmarkProgress) => void;
  signal?: AbortSignal;
}

/**
 * Executes a single iteration of the benchmark.
 * If assertions are provided, evaluates them against the response.
 */
async function runSingleIteration(
  runId: string,
  iterationNum: number,
  request: Request,
  variables: Record<string, string>,
  assertions?: AssertionRow[],
  signal?: AbortSignal
): Promise<Omit<BenchmarkIteration, 'id' | 'executed_at'>> {
  try {
    const result = await executeRequest(
      {
        method: request.method,
        url: request.url,
        headers: request.headers,
        queryParams: request.query_params,
        bodyType: request.body_type,
        body: request.body ?? '',
      },
      variables,
      signal,
      30000 // 30s timeout
    );

    // Evaluate assertions if configured
    let assertionPassed: boolean | null = null;
    let assertionFailures: string[] = [];

    if (assertions && assertions.length > 0) {
      const summary = evaluateAssertions(result, assertions);
      assertionPassed = summary.passed;
      assertionFailures = summary.failures;
    }

    return {
      run_id: runId,
      iteration_num: iterationNum,
      status_code: result.status,
      latency_ms: result.totalTime,
      ttfb_ms: result.ttfb,
      response_size: result.size,
      error: null,
      assertion_passed: assertionPassed,
      assertion_failures: assertionFailures,
    };
  } catch (err) {
    const errorMsg = (err as RequestError).message ?? 'Unknown error';
    return {
      run_id: runId,
      iteration_num: iterationNum,
      status_code: null,
      latency_ms: null,
      ttfb_ms: null,
      response_size: null,
      error: errorMsg,
      assertion_passed: null,
      assertion_failures: [],
    };
  }
}

/**
 * Calculates percentiles given a sorted array of numbers.
 */
function calculatePercentile(sortedList: number[], percentile: number): number | null {
  if (sortedList.length === 0) return null;
  const index = Math.ceil((percentile / 100) * sortedList.length) - 1;
  return sortedList[index];
}

/**
 * Runs the benchmark in controlled batches, saving iterations to the DB and updating stats at the end.
 */
export async function startBenchmarkRun({
  request,
  variables,
  mode,
  totalIterations = 0,
  batchSize = 1,
  durationMs = 0,
  startBatchSize = 1,
  endBatchSize = 1,
  baseBatchSize = 1,
  spikeBatchSize = 1,
  spikeTimeMs = 0,
  assertions,
  onProgress,
  signal,
}: BenchmarkRunOptions) {
  // 1. Create run record
  const run = await createBenchmarkRun(request.id, totalIterations || durationMs, batchSize || startBatchSize);
  if (!run) throw new Error('Failed to create benchmark run in database.');

  const runId = run.id;
  const startTime = Date.now();
  
  let completed = 0;
  let batchIndex = 0;
  const allIterations: Omit<BenchmarkIteration, 'id' | 'executed_at'>[] = [];

  // 2. Loop condition based on mode
  const isTimeBased = mode === 'ramp' || mode === 'soak';

  while (true) {
    if (signal?.aborted) break;

    const elapsedMs = Date.now() - startTime;

    // Check termination conditions
    if (isTimeBased) {
      if (elapsedMs >= durationMs) break;
    } else {
      if (completed >= totalIterations) break;
    }

    // Determine current batch size based on mode
    let currentBatchSize = 1;
    if (mode === 'fixed') {
      currentBatchSize = Math.min(batchSize, totalIterations - completed);
    } else if (mode === 'soak') {
      currentBatchSize = batchSize;
    } else if (mode === 'ramp') {
      const progress = Math.min(1, elapsedMs / durationMs);
      currentBatchSize = Math.floor(startBatchSize + (endBatchSize - startBatchSize) * progress);
      currentBatchSize = Math.max(1, currentBatchSize);
    } else if (mode === 'spike') {
      const isSpike = elapsedMs >= spikeTimeMs && elapsedMs <= spikeTimeMs + 10000; // 10 second spike duration
      currentBatchSize = isSpike ? spikeBatchSize : baseBatchSize;
      currentBatchSize = Math.min(currentBatchSize, totalIterations - completed);
    }

    if (currentBatchSize <= 0) break;

    const batchPromises: Promise<Omit<BenchmarkIteration, 'id' | 'executed_at'>>[] = [];
    for (let j = 0; j < currentBatchSize; j++) {
      const iterationNum = completed + j + 1;
      batchPromises.push(runSingleIteration(runId, iterationNum, request, variables, assertions, signal));
    }

    const batchResults = await Promise.all(batchPromises);
    
    // Sampling for soak mode to protect DB health
    if (mode === 'soak') {
      // Save only the first iteration of each batch as a sample
      if (batchResults.length > 0) {
        await insertBenchmarkIterations([batchResults[0]]);
      }
    } else {
      // For all other modes, save all iterations to generate accurate charts
      await insertBenchmarkIterations(batchResults);
    }
    
    allIterations.push(...batchResults);
    completed += currentBatchSize;
    batchIndex++;
    
    if (onProgress) {
      onProgress({
        total: isTimeBased ? durationMs : totalIterations,
        completed: isTimeBased ? elapsedMs : completed,
        currentBatch: batchIndex,
      });
    }

    // Brief yield to event loop to avoid completely locking JS thread on fast responses
    await new Promise(r => setTimeout(r, 10));
  }

  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  // 3. Calculate Stats
  const successfulLatencies = allIterations
    .filter((it) => it.latency_ms !== null)
    .map((it) => it.latency_ms as number)
    .sort((a, b) => a - b);

  const errorCount = allIterations.filter((it) => it.error !== null).length;
  const errorRate = (errorCount / (completed || 1)) * 100;

  let minLatency = null;
  let maxLatency = null;
  let avgLatency = null;
  let p50Latency = null;
  let p95Latency = null;
  let p99Latency = null;

  if (successfulLatencies.length > 0) {
    minLatency = successfulLatencies[0];
    maxLatency = successfulLatencies[successfulLatencies.length - 1];
    
    const sum = successfulLatencies.reduce((a, b) => a + b, 0);
    avgLatency = Math.round(sum / successfulLatencies.length);

    p50Latency = calculatePercentile(successfulLatencies, 50);
    p95Latency = calculatePercentile(successfulLatencies, 95);
    p99Latency = calculatePercentile(successfulLatencies, 99);
  }

  const finalStats = {
    min_latency: minLatency,
    max_latency: maxLatency,
    avg_latency: avgLatency,
    p50_latency: p50Latency,
    p95_latency: p95Latency,
    p99_latency: p99Latency,
    error_rate: errorRate,
    total_duration: totalDuration,
    completed_at: new Date().toISOString(),
  };

  // 4. Update Run Record
  await updateBenchmarkRunStats(runId, finalStats);

  return {
    runId,
    stats: finalStats,
    iterations: allIterations,
    wasAborted: !!signal?.aborted,
  };
}
