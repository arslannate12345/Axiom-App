// ─── Database Testing Domain Types ──────────────────────────────

export type DatabaseTestSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type DatabaseTestCategory = 
  | 'connection'
  | 'performance'
  | 'schema'
  | 'crud'
  | 'integrity'
  | 'security';

export interface DatabaseTestFinding {
  id: string;
  category: DatabaseTestCategory;
  title: string;
  severity: DatabaseTestSeverity;
  status: 'pass' | 'fail' | 'warn';
  description: string;
  impact: string;
  latencyMs?: number;
  recommendation?: string;
}

export interface DatabaseEndpointCheck {
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  passed: boolean;
  notes?: string;
}

export interface DatabaseAudit {
  id: string;
  user_id?: string;
  workspace_id?: string;
  url: string;
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  findings: DatabaseTestFinding[];
  endpoint_checks: DatabaseEndpointCheck[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    passedCount: number;
    avgLatencyMs: number;
  };
  created_at: string;
  updated_at?: string;
}
