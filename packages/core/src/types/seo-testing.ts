// ─── SEO Testing Domain Types ────────────────────────────────────

export type SeoSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type SeoCategory = 
  | 'meta'
  | 'open_graph'
  | 'links'
  | 'crawlability'
  | 'headings';

export interface SeoFinding {
  id: string;
  category: SeoCategory;
  title: string;
  severity: SeoSeverity;
  status: 'pass' | 'fail' | 'warn';
  description: string;
  impact: string;
  recommendation?: string;
}

export interface MetaTagCheck {
  tag: string;
  present: boolean;
  value: string | null;
  status: 'pass' | 'fail' | 'warn';
  notes?: string;
}

export interface HeadingItem {
  level: number; // 1-6
  text: string;
}

export interface SeoAudit {
  id: string;
  user_id?: string;
  workspace_id?: string;
  url: string;
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  findings: SeoFinding[];
  meta_checks: MetaTagCheck[];
  heading_hierarchy: HeadingItem[];
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
