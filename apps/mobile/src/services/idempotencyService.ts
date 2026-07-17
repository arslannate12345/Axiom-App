import { executeRequest, RequestConfig, ResponseTiming } from './networkService';
import { compareSnapshots, DiffResult } from './diffService';
import type { Request } from '../types/database';

export interface IdempotencyConfig {
  mode: 'sequential' | 'parallel';
}

export interface IdempotencyResult {
  request1: ResponseTiming;
  request2: ResponseTiming;
  isIdempotent: boolean;
  statusMatch: boolean;
  differences: DiffResult[];
  error?: string;
}

export async function runIdempotencyTest(
  baseRequest: Request,
  variables: Record<string, string>,
  config: IdempotencyConfig,
  signal?: AbortSignal
): Promise<IdempotencyResult> {
  const reqConfig: RequestConfig = {
    method: baseRequest.method,
    url: baseRequest.url,
    headers: baseRequest.headers,
    queryParams: baseRequest.query_params,
    bodyType: baseRequest.body_type,
    body: baseRequest.body,
  };

  let res1: ResponseTiming;
  let res2: ResponseTiming;

  try {
    if (config.mode === 'parallel') {
      [res1, res2] = await Promise.all([
        executeRequest(reqConfig, variables, signal),
        executeRequest(reqConfig, variables, signal)
      ]);
    } else {
      res1 = await executeRequest(reqConfig, variables, signal);
      if (signal?.aborted) throw new Error('Aborted');
      res2 = await executeRequest(reqConfig, variables, signal);
    }
  } catch (e: any) {
    return {
      request1: {} as ResponseTiming,
      request2: {} as ResponseTiming,
      isIdempotent: false,
      statusMatch: false,
      differences: [],
      error: e.message || 'Network error during idempotency test',
    };
  }

  const statusMatch = res1.status === res2.status;
  const differences = compareSnapshots(res1.body, res2.body);

  // Consider it idempotent if status matches AND there are no structural/data differences
  // In a real app, you might ignore timestamps or UUIDs, but for basic idempotency deep-diff works
  const isIdempotent = statusMatch && differences.length === 0;

  return {
    request1: res1,
    request2: res2,
    isIdempotent,
    statusMatch,
    differences,
  };
}
