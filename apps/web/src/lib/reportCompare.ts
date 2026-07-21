import type { AggregatedReport, ReportIssue } from './reportGenerator';

// ─── Types ─────────────────────────────────────────────────

export interface IssueComparison {
  id: string;
  section: string;
  title: string;
  severity: string;
  baselineStatus: string | null;
  currentStatus: string;
  change: 'fixed' | 'improved' | 'unchanged' | 'new';
}

export interface ComparisonResult {
  baselineDate: string;
  currentDate: string;
  baselineHealth: number;
  currentHealth: number;
  healthDelta: number;
  issues: IssueComparison[];
  summary: string;
}

// ─── Compare Engine ────────────────────────────────────────

export function compareReports(
  baseline: AggregatedReport,
  current: AggregatedReport,
): ComparisonResult {
  const baselineIssues = new Map(baseline.issues.map((i) => [i.title, i]));
  const currentIssues = new Map(current.issues.map((i) => [i.title, i]));

  const comparisons: IssueComparison[] = [];

  // Issues that existed in baseline
  for (const [title, bIssue] of baselineIssues) {
    const cIssue = currentIssues.get(title);
    if (!cIssue) {
      comparisons.push({
        id: bIssue.id,
        section: bIssue.section,
        title,
        severity: bIssue.severity,
        baselineStatus: bIssue.status,
        currentStatus: 'verified',
        change: 'fixed',
      });
    } else if (cIssue.status === 'fixed' || cIssue.status === 'verified') {
      comparisons.push({
        id: cIssue.id,
        section: cIssue.section,
        title,
        severity: cIssue.severity,
        baselineStatus: bIssue.status,
        currentStatus: cIssue.status,
        change: 'fixed',
      });
    } else if (cIssue.severity !== bIssue.severity) {
      comparisons.push({
        id: cIssue.id,
        section: cIssue.section,
        title,
        severity: cIssue.severity,
        baselineStatus: bIssue.status,
        currentStatus: cIssue.status,
        change: cIssue.severity === 'info' && bIssue.severity === 'critical' ? 'improved' : 'unchanged',
      });
    } else {
      comparisons.push({
        id: cIssue.id,
        section: cIssue.section,
        title,
        severity: cIssue.severity,
        baselineStatus: bIssue.status,
        currentStatus: cIssue.status,
        change: 'unchanged',
      });
    }
  }

  // New issues not in baseline
  for (const [title, cIssue] of currentIssues) {
    if (!baselineIssues.has(title)) {
      comparisons.push({
        id: cIssue.id,
        section: cIssue.section,
        title,
        severity: cIssue.severity,
        baselineStatus: null,
        currentStatus: cIssue.status,
        change: 'new',
      });
    }
  }

  const fixed = comparisons.filter((c) => c.change === 'fixed').length;
  const improved = comparisons.filter((c) => c.change === 'improved').length;
  const unchanged = comparisons.filter((c) => c.change === 'unchanged').length;
  const newIssues = comparisons.filter((c) => c.change === 'new').length;

  const healthDelta = current.healthScore - baseline.healthScore;
  let summary = '';
  if (healthDelta > 0) summary = `Health improved by ${healthDelta} points. `;
  else if (healthDelta < 0) summary = `Health declined by ${Math.abs(healthDelta)} points. `;
  else summary = 'Health score unchanged. ';
  summary += `${fixed} fixed, ${improved} improved, ${unchanged} unchanged, ${newIssues} new.`;

  return {
    baselineDate: baseline.ranAt,
    currentDate: current.ranAt,
    baselineHealth: baseline.healthScore,
    currentHealth: current.healthScore,
    healthDelta,
    issues: comparisons,
    summary,
  };
}
