import { executeRequest, RequestError } from './networkService';
import {
  createBenchmarkRun,
  insertBenchmarkIterations,
  updateBenchmarkRunStats,
} from './dataService';
import type { Request, EnvironmentVariable, BenchmarkIteration } from '../types/database';

export interface BenchmarkProgress {
  total: number;
  completed: number;
  currentBatch: number;
}

export interface BenchmarkRunOptions {
  request: Request;
  variables: EnvironmentVariable[];
  totalIterations: number;
  batchSize: number;
  onProgress?: (progress: BenchmarkProgress) => void;
  signal?: AbortSignal;
}

/**
 * Executes a single iteration of the benchmark.
 */
async function runSingleIteration(
  runId: string,
  iterationNum: number,
  request: Request,
  variables: EnvironmentVariable[],
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

    return {
      run_id: runId,
      iteration_num: iterationNum,
      status_code: result.status,
      latency_ms: result.totalTime,
      ttfb_ms: result.ttfb,
      response_size: result.size,
      error: null,
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
  totalIterations,
  batchSize,
  onProgress,
  signal,
}: BenchmarkRunOptions) {
  // 1. Create run record
  const run = await createBenchmarkRun(request.id, totalIterations, batchSize);
  if (!run) throw new Error('Failed to create benchmark run in database.');

  const runId = run.id;
  const startTime = Date.now();
  
  let completed = 0;
  const allIterations: Omit<BenchmarkIteration, 'id' | 'executed_at'>[] = [];

  // 2. Batch Execution Loop
  for (let i = 0; i < totalIterations; i += batchSize) {
    if (signal?.aborted) break;

    const batchPromises: Promise<Omit<BenchmarkIteration, 'id' | 'executed_at'>>[] = [];
    const currentBatchSize = Math.min(batchSize, totalIterations - i);

    for (let j = 0; j < currentBatchSize; j++) {
      const iterationNum = i + j + 1;
      batchPromises.push(runSingleIteration(runId, iterationNum, request, variables, signal));
    }

    // Wait for the entire batch to finish concurrently
    const batchResults = await Promise.all(batchPromises);
    
    // Store batch results in DB
    await insertBenchmarkIterations(batchResults);
    
    // Track in memory for final stats calculation
    allIterations.push(...batchResults);
    
    completed += currentBatchSize;
    
    if (onProgress) {
      onProgress({
        total: totalIterations,
        completed,
        currentBatch: Math.floor(i / batchSize) + 1,
      });
    }
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
