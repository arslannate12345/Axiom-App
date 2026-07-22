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

export interface VisualCaptureSession {
  id: string;
  user_id?: string;
  workspace_id?: string;
  url: string;
  viewports: ViewportConfig[];
  snapshots: VisualSnapshot[];
  diff_results: VisualDiffResult[];
  overallMatchScore: number;
  status: 'passed' | 'warning' | 'failed';
  created_at: string;
  updated_at?: string;
}
