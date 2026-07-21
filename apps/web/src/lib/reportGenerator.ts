import type { BenchmarkResult } from './testEngine';
import type { SecurityResult } from './testEngine';
import type { FuzzResult } from './testEngine';
import type { ChaosIteration } from './testEngine';
import type { IdempotencyResult } from './testEngine';
import type { RegressionDiff } from './testEngine';
import type { RequestRecord } from './supabase-service';
import { getRemediation } from './remediation';
import type { Remediation } from './remediation';

// ─── Types ─────────────────────────────────────────────────

export interface ReportIssue {
  id: string;
  section: 'benchmarks' | 'security' | 'fuzz' | 'chaos' | 'idempotency' | 'regression';
  title: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'acknowledged' | 'fixed' | 'verified';
  description: string;
  resolvedAt?: string;
  developerNote?: string;
  remediation: Remediation;
}

export interface AggregatedSection {
  benchmarks?: BenchmarkResult;
  security?: SecurityResult;
  fuzz?: FuzzResult[];
  chaos?: ChaosIteration[];
  idempotency?: IdempotencyResult;
  regression?: { diffs: RegressionDiff[] };
}

export interface AggregatedReport {
  request: {
    id: string;
    method: string;
    url: string;
    name: string;
  };
  ranAt: string;
  baselineId: string | null;
  sections: AggregatedSection;
  healthScore: number;
  issues: ReportIssue[];
  summaryText: string;
}

export type TestSection = AggregatedSection;

// ─── Health Score Calculation ──────────────────────────────

const SECTION_WEIGHTS: Record<keyof AggregatedSection, number> = {
  security: 30,
  benchmarks: 25,
  fuzz: 20,
  chaos: 10,
  idempotency: 10,
  regression: 5,
};

function computeSectionScore(section: keyof AggregatedSection, data: AggregatedSection): number {
  const weight = SECTION_WEIGHTS[section];
  switch (section) {
    case 'benchmarks': {
      const b = data.benchmarks;
      if (!b) return 0;
      const ratio = b.stats.successRate / 100;
      return Math.round(weight * ratio);
    }
    case 'security': {
      const s = data.security;
      if (!s) return 0;
      return Math.round(weight * (s.healthScore / 100));
    }
    case 'fuzz': {
      const f = data.fuzz;
      if (!f || f.length === 0) return 0;
      const total = f.reduce((s, r) => s + r.total, 0);
      const safe = f.reduce((s, r) => s + r.safe, 0);
      return total > 0 ? Math.round(weight * (safe / total)) : 0;
    }
    case 'chaos': {
      const c = data.chaos;
      if (!c || c.length === 0) return 0;
      const passed = c.filter((r) => r.status === 'passed').length;
      return Math.round(weight * (passed / c.length));
    }
    case 'idempotency': {
      return data.idempotency?.isIdempotent ? weight : 0;
    }
    case 'regression': {
      if (!data.regression) return 0;
      return data.regression.diffs.length === 0 ? weight : 0;
    }
    default:
      return 0;
  }
}

function extractIssues(sections: AggregatedSection): ReportIssue[] {
  const issues: ReportIssue[] = [];
  let idCounter = 0;
  const issue = (
    section: ReportIssue['section'],
    title: string,
    severity: ReportIssue['severity'],
    description: string,
  ) => {
    idCounter++;
    return { id: `issue_${idCounter}_${Date.now()}`, section, title, severity, status: 'open' as const, description, remediation: getRemediation(title, section) };
  };

  if (sections.benchmarks) {
    const b = sections.benchmarks;
    if (b.stats.successRate < 100) {
      issues.push(issue('benchmarks', 'Failed iterations detected', 'warning',
        `${b.iterations.length - b.iterations.filter((i) => i.status >= 200 && i.status < 300).length} out of ${b.iterations.length} iterations returned non-2xx status codes. Success rate: ${b.stats.successRate}%.`));
    }
    if (b.stats.p99 > 500) {
      issues.push(issue('benchmarks', 'High p99 latency', 'warning',
        `p99 latency is ${b.stats.p99}ms which exceeds the 500ms threshold. Average latency is ${b.stats.avgLatency}ms.`));
    }
    if (b.stats.throughput < 1 && b.iterations.length > 10) {
      issues.push(issue('benchmarks', 'Low throughput', 'info',
        `Throughput is ${b.stats.throughput} req/s. For ${b.iterations.length} iterations over ${b.stats.totalTime}ms.`));
    }
  }

  if (sections.security) {
    const s = sections.security;
    for (const check of s.checks) {
      if (check.status === 'fail') {
        issues.push(issue('security', check.label, check.critical ? 'critical' : 'warning', check.detail));
      } else if (check.status === 'warning') {
        issues.push(issue('security', check.label, 'warning', check.detail));
      }
    }
  }

  if (sections.fuzz) {
    for (const r of sections.fuzz) {
      if (r.crash > 0) {
        issues.push(issue('fuzz', `${r.strategy} strategy caused crashes`, 'warning',
          `${r.crash} out of ${r.total} requests with "${r.strategy}" strategy returned 5xx errors or crashed.`));
      }
      if (r.timeout > r.total * 0.3) {
        issues.push(issue('fuzz', `${r.strategy} strategy had high timeouts`, 'warning',
          `${r.timeout} out of ${r.total} requests timed out (${Math.round((r.timeout / r.total) * 100)}%).`));
      }
    }
  }

  if (sections.chaos) {
    const c = sections.chaos;
    const dropped = c.filter((r) => r.status === 'dropped').length;
    const failed = c.filter((r) => r.status === 'failed').length;
    if (dropped > 0) {
      issues.push(issue('chaos', 'Requests dropped under network simulation', 'info',
        `${dropped} out of ${c.length} requests were dropped during chaos testing.`));
    }
    if (failed > c.length * 0.3) {
      issues.push(issue('chaos', 'High failure rate under chaos', 'warning',
        `${failed} out of ${c.length} requests failed under injected latency (${Math.round((failed / c.length) * 100)}% failure rate).`));
    }
  }

  if (sections.idempotency) {
    const idem = sections.idempotency;
    if (!idem.isIdempotent) {
      issues.push(issue('idempotency', 'Request is not idempotent', idem.diffs.length > 0 ? 'critical' : 'warning',
        `${idem.diffs.length} difference(s) found between two consecutive requests. Status codes: ${idem.status1} vs ${idem.status2}.`));
    }
  }

  if (sections.regression) {
    const reg = sections.regression;
    if (reg.diffs.length > 0) {
      issues.push(issue('regression', 'Response differs from baseline', 'warning',
        `${reg.diffs.length} field(s) changed compared to the saved baseline snapshot.`));
    }
  }

  return issues;
}

function generateSummaryText(sections: AggregatedSection, healthScore: number): string {
  const parts: string[] = [];

  if (sections.benchmarks) {
    parts.push(`Benchmarks: avg ${sections.benchmarks.stats.avgLatency}ms, ${sections.benchmarks.stats.successRate}% success`);
  }
  if (sections.security) {
    parts.push(`Security: ${sections.security.healthScore}/100 health score`);
  }
  if (sections.fuzz) {
    const total = sections.fuzz.reduce((s, r) => s + r.safe, 0);
    const all = sections.fuzz.reduce((s, r) => s + r.total, 0);
    parts.push(`Fuzz: ${total}/${all} safe mutations`);
  }
  if (sections.chaos) {
    const passed = sections.chaos.filter((r) => r.status === 'passed').length;
    parts.push(`Chaos: ${passed}/${sections.chaos.length} passed`);
  }
  if (sections.idempotency) {
    parts.push(`Idempotency: ${sections.idempotency.isIdempotent ? 'Pass' : 'Fail'}`);
  }
  if (sections.regression) {
    parts.push(`Regression: ${sections.regression.diffs.length === 0 ? 'No diffs' : `${sections.regression.diffs.length} diffs`}`);
  }

  return `Overall Health: ${healthScore}/100 | ${parts.join(' | ')}`;
}

// ─── Main Generator ────────────────────────────────────────

export function generateReport(params: {
  request: RequestRecord;
  sections: AggregatedSection;
  baselineId?: string | null;
}): AggregatedReport {
  const { request, sections, baselineId } = params;

  let totalScore = 0;
  let totalWeight = 0;
  for (const key of Object.keys(SECTION_WEIGHTS) as (keyof AggregatedSection)[]) {
    if (sections[key] !== undefined) {
      totalScore += computeSectionScore(key, sections);
      totalWeight += SECTION_WEIGHTS[key];
    }
  }

  const healthScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  const issues = extractIssues(sections);
  const summaryText = generateSummaryText(sections, healthScore);

  return {
    request: {
      id: request.id,
      method: request.method,
      url: request.url,
      name: request.name,
    },
    ranAt: new Date().toISOString(),
    baselineId: baselineId ?? null,
    sections,
    healthScore,
    issues,
    summaryText,
  };
}
