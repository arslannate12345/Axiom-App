// ============================================================
// ASSERTION TYPES
// ============================================================

export type AssertionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'exists'
  | 'notExists'
  | 'matchesRegex'
  | 'lessThan'
  | 'greaterThan'
  | 'jsonPathEquals';

export const ASSERTION_OPERATORS: { value: AssertionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Not Contains' },
  { value: 'exists', label: 'Exists' },
  { value: 'notExists', label: 'Not Exists' },
  { value: 'matchesRegex', label: 'Matches Regex' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'jsonPathEquals', label: 'JSONPath Equals' },
];

/** Fields that can be asserted against, with their source location */
export const ASSERTABLE_FIELDS = [
  { value: 'status', label: 'Status Code', hint: 'e.g. 200' },
  { value: 'totalTime', label: 'Total Time (ms)', hint: 'e.g. 500' },
  { value: 'ttfb', label: 'TTFB (ms)', hint: 'e.g. 200' },
  { value: 'size', label: 'Response Size (bytes)', hint: 'e.g. 1024' },
  { value: 'body', label: 'Response Body', hint: 'Full body text' },
  { value: 'jsonpath', label: 'JSONPath (body)', hint: 'e.g. $.data.token' },
  { value: 'header', label: 'Response Header', hint: 'e.g. content-type' },
] as const;

export interface Assertion {
  id: string;
  request_id: string;
  field: string;
  operator: AssertionOperator;
  expected_value: string | null;
  sort_order: number;
  created_at: string;
}

/** A local-only assertion row for the editor (before saving to DB) */
export interface AssertionRow {
  id?: string;
  field: string;
  operator: AssertionOperator;
  expected_value: string;
  enabled: boolean;
}

export interface AssertionResult {
  assertion: AssertionRow;
  passed: boolean;
  actual_value: string | null;
  message: string;
}

export interface AssertionSummary {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  results: AssertionResult[];
  failures: string[];
}
