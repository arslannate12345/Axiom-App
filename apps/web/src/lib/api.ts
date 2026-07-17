export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'raw';

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

const VARIABLE_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

function interpolateVariables(template: string, variables: Record<string, string>): string {
  return template.replace(VARIABLE_REGEX, (match, key) => variables[key] ?? match);
}

function buildQueryString(params: KeyValuePair[], variables: Record<string, string>): string {
  const active = params.filter((p) => p.enabled && p.key.trim());
  if (!active.length) return '';
  const searchParams = new URLSearchParams();
  for (const p of active) {
    const key = interpolateVariables(p.key.trim(), variables);
    const value = interpolateVariables(p.value, variables);
    searchParams.append(key, value);
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

function buildHeadersArray(
  headers: KeyValuePair[],
  variables: Record<string, string>,
  bodyType: BodyType,
): Record<string, string> {
  const result: Record<string, string> = {};

  // Default Content-Type per body type
  if (bodyType === 'json') result['Content-Type'] = 'application/json';
  else if (bodyType === 'raw') result['Content-Type'] = 'text/plain';

  // User headers override defaults
  for (const h of headers) {
    if (!h.enabled || !h.key.trim()) continue;
    result[h.key.trim()] = interpolateVariables(h.value, variables);
  }

  return result;
}

export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return '#10B981';
  if (status >= 300 && status < 400) return '#F59E0B';
  if (status >= 400 && status < 500) return '#EF4444';
  if (status >= 500) return '#EF4444';
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
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatMs(ms: number): string {
  if (!ms || ms === 0) return '0ms';
  return `${Math.round(ms)}ms`;
}

export async function executeRequest(
  config: RequestConfig,
  variables: Record<string, string> = {},
  signal?: AbortSignal,
  timeoutMs: number = 30000,
): Promise<ResponseTiming> {
  // Validate URL
  if (!/^https?:\/\//i.test(config.url.trim())) {
    throw { message: 'Invalid URL. Must start with http:// or https://', isNetworkError: true } as RequestError;
  }

  const url = interpolateVariables(config.url.trim(), variables);
  const queryString = buildQueryString(config.queryParams, variables);
  const fullUrl = `${url}${queryString}`;

  const headers = buildHeadersArray(config.headers, variables, config.bodyType);

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
  };

  if (config.method !== 'GET' && config.method !== 'HEAD' && config.bodyType !== 'none' && config.body) {
    const body = interpolateVariables(config.body, variables);
    fetchOptions.body = body;
  }

  // Abort controller composition
  const internalController = new AbortController();
  if (signal?.aborted) {
    internalController.abort();
  } else if (signal) {
    signal.addEventListener('abort', () => internalController.abort(), { once: true });
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => internalController.abort(), timeoutMs);
  }

  fetchOptions.signal = internalController.signal;

  const startTime = performance.now();

  try {
    const response = await fetch(fullUrl, fetchOptions);
    const ttfb = performance.now() - startTime;

    const bodyText = await response.text();
    const totalTime = performance.now() - startTime;

    clearTimeout(timeoutId);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const size = new TextEncoder().encode(bodyText).length;

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: bodyText,
      size,
      ttfb: Math.round(ttfb),
      totalTime: Math.round(totalTime),
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (internalController.signal.aborted) {
      throw {
        message: timeoutId ? 'Request timed out' : 'Request cancelled',
        isTimeout: !!timeoutId,
      } as RequestError;
    }

    const error = err as Error;
    throw {
      message: error.message || 'Network request failed',
      isNetworkError: true,
    } as RequestError;
  }
}
