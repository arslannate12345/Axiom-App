import {
  interpolateVariables,
  interpolateHeaders,
  buildQueryString,
  buildBody,
} from './variableService';
import type { HttpMethod, BodyType, KeyValuePair } from '../types/database';

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  body: string | null;
}

export interface ResponseTiming {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  ttfb: number;
  totalTime: number;
}

export interface RequestError {
  message: string;
  status?: number;
  isTimeout?: boolean;
  isNetworkError?: boolean;
}

export async function executeRequest(
  config: RequestConfig,
  variables: Record<string, string>,
  signal?: AbortSignal,
  timeoutMs?: number
): Promise<ResponseTiming> {
  const interpolatedUrl = interpolateVariables(config.url, variables);
  const queryString = buildQueryString(config.queryParams, variables);
  const fullUrl = queryString ? `${interpolatedUrl}?${queryString}` : interpolatedUrl;
  const headers = interpolateHeaders(config.headers, variables);
  const body = buildBody(config.bodyType, config.body, variables);

  const controller = new AbortController();

  // Link caller's signal to our internal controller so both
  // caller abort and timeout abort go through the same signal.
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  // Set Content-Type based on body type; user headers override this.
  const defaultHeaders: Record<string, string> = {};
  if (config.bodyType === 'json') {
    defaultHeaders['Content-Type'] = 'application/json';
  } else if (config.bodyType === 'x-www-form-urlencoded') {
    defaultHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (config.bodyType === 'raw') {
    defaultHeaders['Content-Type'] = 'text/plain';
  }
  // 'form-data' and 'none' intentionally omit Content-Type.

  const fetchOptions: RequestInit = {
    method: config.method,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    signal: controller.signal,
  };

  if (body && config.method !== 'GET' && config.method !== 'HEAD') {
    fetchOptions.body = body;
  }

  const startTime = performance.now();

  try {
    const response = await fetch(fullUrl, fetchOptions);
    const ttfb = performance.now() - startTime;

    const responseBody = await response.text();
    const totalTime = performance.now() - startTime;
    const size = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(responseBody).length
      : responseBody.length;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      size,
      ttfb: Math.round(ttfb),
      totalTime: Math.round(totalTime),
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw {
        message: timeoutId ? 'Request timed out' : 'Request cancelled',
        isTimeout: !!timeoutId,
      } satisfies RequestError;
    }

    throw {
      message: err instanceof Error ? err.message : 'Network request failed',
      isNetworkError: true,
    } satisfies RequestError;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return '#22C55E';
  if (status >= 300 && status < 400) return '#F59E0B';
  if (status >= 400) return '#EF4444';
  return '#64748B';
}

export function getStatusLabel(status: number): string {
  if (status >= 200 && status < 300) return 'Success';
  if (status >= 300 && status < 400) return 'Redirect';
  if (status >= 400 && status < 500) return 'Client Error';
  if (status >= 500) return 'Server Error';
  return 'Unknown';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
