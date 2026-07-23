// ─── Visual & Responsive Domain Types ─────────────────────────

export type ViewportDevice = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export interface ViewportConfig {
  id: ViewportDevice;
  label: string;
  width: number;
  height: number;
  icon: string;
  deviceScaleFactor?: number;
}

export interface VisualSnapshot {
  id: string;
  viewport: ViewportConfig;
  imageUrl?: string;
  renderedAt: string;
  status: 'completed' | 'failed' | 'pending';
}

export interface VisualDiffResult {
  viewportId: ViewportDevice;
  matchScore: number; // 0-100 (100 = identical)
  mismatchPercentage: number; // 0-100%
  baselineImageUrl?: string;
  currentImageUrl?: string;
  diffImageUrl?: string;
}

export type HciCategory =
  | 'latency_delay'
  | 'visual_hierarchy'
  | 'feedback_status'
  | 'touch_target'
  | 'cognitive_load';

export type HciSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface HciFinding {
  id: string;
  category: HciCategory;
  title: string;
  severity: HciSeverity;
  status: 'pass' | 'fail' | 'warn';
  description: string;
  impact: string;
  recommendation: string;
  elementSelector?: string;
}

export interface HciDiagnosticResult {
  hciScore: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  findings: HciFinding[];
  cardMetrics: {
    totalCardsDetected: number;
    avgTransitionDelayMs: number;
    hasExcessiveDelays: boolean;
    touchTargetIssuesCount: number;
    hasHorizontalOverflow: boolean;
  };
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    passedCount: number;
  };
}

export interface VisualCaptureSession {
  id: string;
  user_id?: string;
  workspace_id?: string;
  url: string;
  viewports: ViewportConfig[];
  snapshots: VisualSnapshot[];
  diff_results: VisualDiffResult[];
  overallMatchScore: number;
  hciDiagnostic?: HciDiagnosticResult;
  status: 'passed' | 'warning' | 'failed';
  created_at: string;
  updated_at?: string;
}

