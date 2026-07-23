// ─── Load & Stress Testing Domain Types ─────────────────────────

export type LoadTestStrategy = 'ramp_up' | 'spike' | 'constant';

export interface LoadTestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  virtualUsers: number; // 10 - 500
  durationSeconds: number; // 5 - 60
  strategy: LoadTestStrategy;
}

export interface LoadIterationMetric {
  iteration: number;
  latencyMs: number;
  statusCode: number;
  success: boolean;
  timestampMs: number;
}

export interface LoadMetricsSummary {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputRps: number;
  errorRatePercentage: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface LoadAudit {
  id: string;
  user_id?: string;
  workspace_id?: string;
  url: string;
  score: number; // 0-100 (resilience score)
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  config: LoadTestConfig;
  summary: LoadMetricsSummary;
  iterations: LoadIterationMetric[];
  statusBreakdown: Record<string, number>;
  created_at: string;
  updated_at?: string;
}
