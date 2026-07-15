import { executeRequest, RequestConfig, ResponseTiming } from './networkService';
import type { Request } from '../types/database';

export interface ChaosConfig {
  iterations: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  dropProbability: number; // 0 to 1
}

export interface ChaosResult {
  iteration: number;
  status: 'passed' | 'dropped' | 'failed';
  injectedLatencyMs: number;
  responseStatus?: number;
  totalTimeMs?: number;
  error?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runChaosTest(
  baseRequest: Request,
  variables: Record<string, string>,
  config: ChaosConfig,
  onProgress: (iteration: number, total: number, result: ChaosResult) => void,
  signal?: AbortSignal
): Promise<ChaosResult[]> {
  const results: ChaosResult[] = [];
  
  for (let i = 1; i <= config.iterations; i++) {
    if (signal?.aborted) break;

    // 1. Determine if we drop
    const shouldDrop = Math.random() < config.dropProbability;
    
    if (shouldDrop) {
      const result: ChaosResult = {
        iteration: i,
        status: 'dropped',
        injectedLatencyMs: 0,
        error: 'Simulated network drop'
      };
      results.push(result);
      onProgress(i, config.iterations, result);
      continue;
    }

    // 2. Determine latency
    const injectedLatencyMs = Math.floor(
      Math.random() * (config.maxLatencyMs - config.minLatencyMs + 1)
    ) + config.minLatencyMs;

    if (injectedLatencyMs > 0) {
      await sleep(injectedLatencyMs);
    }
    
    if (signal?.aborted) break;

    // 3. Execute
    const reqConfig: RequestConfig = {
      method: baseRequest.method,
      url: baseRequest.url,
      headers: baseRequest.headers,
      queryParams: baseRequest.query_params,
      bodyType: baseRequest.body_type,
      body: baseRequest.body,
    };

    try {
      const res = await executeRequest(reqConfig, variables, signal);
      const isFailed = res.status >= 400; // Consider >= 400 as a failure of the API logic under chaos
      
      const result: ChaosResult = {
        iteration: i,
        status: isFailed ? 'failed' : 'passed',
        injectedLatencyMs,
        responseStatus: res.status,
        totalTimeMs: res.totalTime,
      };
      results.push(result);
      onProgress(i, config.iterations, result);
    } catch (e: any) {
      const result: ChaosResult = {
        iteration: i,
        status: 'failed',
        injectedLatencyMs,
        error: e.message || 'Network Error',
      };
      results.push(result);
      onProgress(i, config.iterations, result);
    }
  }

  return results;
}
