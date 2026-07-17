export type ReportType = 'collection' | 'request';

export interface ReportData {
  summary: {
    totalRequests: number;
    passedRequests: number;
    failedRequests: number;
    totalDurationMs: number;
    successRate: number;
  };
  details: {
    request: Request;
    step: CollectionRunStep;
  }[];
}

export interface Report {
  id: string;
  user_id: string;
  collection_id: string;
  name: string;
  share_token: string;
  report_type: ReportType;
  report_data: ReportData;
  created_at: string;
  updated_at: string;
}
