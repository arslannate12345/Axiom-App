export type AuditStrategy = 'desktop' | 'mobile';

export interface CoreWebVitals {
  lcp?: number; // Largest Contentful Paint (ms)
  cls?: number; // Cumulative Layout Shift
  inp?: number; // Interaction to Next Paint (ms)
  fcp?: number; // First Contentful Paint (ms)
  ttfb?: number; // Time to First Byte (ms)
}

// Minimal type for the lighthouse raw result we care about
export interface LighthouseCategoryResult {
  score: number;
}

export interface LighthouseCategories {
  performance?: LighthouseCategoryResult;
  accessibility?: LighthouseCategoryResult;
  'best-practices'?: LighthouseCategoryResult;
  seo?: LighthouseCategoryResult;
}

export interface PerformanceAudit {
  id: string;
  user_id: string;
  workspace_id: string;
  url: string;
  strategy: AuditStrategy;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  core_web_vitals: CoreWebVitals;
  lighthouse_result: any; // Raw JSONB
  created_at: string;
  updated_at: string;
}
