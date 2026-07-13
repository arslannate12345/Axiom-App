export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql';

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Request {
  id: string;
  collection_id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  query_params: KeyValuePair[];
  body_type: BodyType;
  body: string | null;
  pre_request_script: string;
  post_response_script: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVariable {
  id: string;
  environment_id: string;
  key: string;
  value: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id: string;
  request_id: string;
  user_id: string;
  status_code: number | null;
  latency_ms: number | null;
  ttfb_ms: number | null;
  response_size: number | null;
  response_headers: Record<string, string>;
  response_body: string | null;
  error_message: string | null;
  is_benchmark: boolean;
  executed_at: string;
}

export interface BenchmarkRun {
  id: string;
  request_id: string;
  user_id: string;
  total_iterations: number;
  batch_size: number;
  min_latency: number | null;
  max_latency: number | null;
  avg_latency: number | null;
  p50_latency: number | null;
  p95_latency: number | null;
  p99_latency: number | null;
  error_rate: number | null;
  total_duration: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface BenchmarkIteration {
  id: string;
  run_id: string;
  iteration_num: number;
  status_code: number | null;
  latency_ms: number | null;
  ttfb_ms: number | null;
  response_size: number | null;
  error: string | null;
  executed_at: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  ttfb: number;
  totalTime: number;
}

export interface BenchmarkResult {
  run: BenchmarkRun;
  iterations: BenchmarkIteration[];
}
