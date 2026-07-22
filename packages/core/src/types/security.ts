// ─── Security Domain Types ────────────────────────────────────

export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityFinding {
  id: string;
  category: 'headers' | 'tls' | 'cookies' | 'exposure' | 'best_practice';
  title: string;
  severity: SecuritySeverity;
  status: 'pass' | 'fail' | 'warn';
  description: string;
  impact: string;
  remediation?: {
    summary: string;
    codeSnippet?: string;
    references?: string[];
  };
}

export interface HeaderCheckResult {
  header: string;
  present: boolean;
  value: string | null;
  status: 'pass' | 'fail' | 'warn';
  recommendation?: string;
}

export interface ExposedPathCheck {
  path: string;
  status: number;
  exposed: boolean;
  severity: SecuritySeverity;
}

export interface SecurityAudit {
  id: string;
  user_id?: string;
  workspace_id?: string;
  url: string;
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  findings: SecurityFinding[];
  header_analysis: HeaderCheckResult[];
  exposed_paths: ExposedPathCheck[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    passedCount: number;
  };
  created_at: string;
  updated_at?: string;
}
