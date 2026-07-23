// ─── Static Code Analysis Types ──────────────────────────────────────

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AnalysisRuleCategory =
  | 'bug'
  | 'security'
  | 'quality'
  | 'maintainability'
  | 'best_practice';

export interface CodeFinding {
  id: string;
  ruleId: string;
  category: AnalysisRuleCategory;
  title: string;
  severity: FindingSeverity;
  line: number;
  column?: number;
  snippet?: string;
  filePath?: string;
  description: string;
  impact: string;
  recommendation: string;
}

export interface FileAnalysisSummary {
  filename: string;
  linesOfCode: number;
  findingsCount: number;
  language: string;
}

export interface CodeAnalysisAudit {
  id: string;
  user_id?: string;
  workspace_id?: string;
  input_mode?: 'paste' | 'github';
  github_url?: string;
  language: 'javascript' | 'typescript' | 'python' | 'multi' | 'unknown';
  filename?: string;
  code_snippet: string;
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  findings: CodeFinding[];
  file_summaries?: FileAnalysisSummary[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    passedRulesCount: number;
    linesOfCode: number;
    filesAnalyzedCount?: number;
  };
  category_breakdown: Record<AnalysisRuleCategory, number>;
  created_at: string;
  updated_at?: string;
}

