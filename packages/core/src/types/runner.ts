import type { Request } from './database';
import type { AssertionSummary } from './assertions';

export interface VariableExtraction {
  id: string;
  request_id: string;
  variable_name: string;
  json_path: string;
  sort_order: number;
}

export interface CollectionRun {
  id: string;
  collection_id: string;
  user_id: string;
  environment_id: string | null;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  total_duration: number | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
}

export interface CollectionRunStep {
  id: string;
  run_id: string;
  request_id: string;
  step_order: number;
  status_code: number | null;
  latency_ms: number | null;
  response_body: string | null;
  assertion_passed: boolean | null;
  assertion_failures: string[];
  extracted_variables: Record<string, string>;
  error: string | null;
  executed_at: string;
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface RunnerStepState {
  request: Request;
  status: StepStatus;
  result?: Omit<CollectionRunStep, 'id' | 'run_id' | 'executed_at'>;
}
