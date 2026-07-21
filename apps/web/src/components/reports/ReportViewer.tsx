'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import type { ReportRecord } from '@/lib/supabase-service';
import type { AggregatedReport } from '@/lib/reportGenerator';
import { exportReportToPDF } from '@/lib/pdfExport';

import { METHOD_COLORS } from '@/lib/constants';

const SECTION_LABELS: Record<string, string> = {
  benchmarks: 'Benchmarks',
  security: 'Security',
  fuzz: 'Fuzzing',
  chaos: 'Chaos',
  idempotency: 'Idempotency',
  regression: 'Regression',
};

type Tab = 'summary' | 'benchmarks' | 'security' | 'fuzz' | 'chaos' | 'idempotency' | 'regression';

interface ReportViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportRecord | null;
}

export function ReportViewer({ open, onOpenChange, report }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [exporting, setExporting] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  if (!report) return null;

  const data = report.report_data as AggregatedReport;
  const sections = data?.sections ?? {};
  const issues = data?.issues ?? [];

  const tabLabels: { id: Tab; label: string; count?: number }[] = ([
    { id: 'summary' as const, label: 'Summary' },
    { id: 'benchmarks' as const, label: 'Benchmarks', count: sections.benchmarks?.stats ? 1 : undefined },
    { id: 'security' as const, label: 'Security', count: sections.security?.vulnerabilities },
    { id: 'fuzz' as const, label: 'Fuzzing', count: sections.fuzz?.length },
    { id: 'chaos' as const, label: 'Chaos', count: sections.chaos?.length },
    { id: 'idempotency' as const, label: 'Idempotency', count: sections.idempotency ? 1 : undefined },
    { id: 'regression' as const, label: 'Regression', count: sections.regression?.diffs?.length },
  ] as { id: Tab; label: string; count?: number }[]).filter((t) => t.id === 'summary' || t.count !== undefined);

  const availableTabs = new Set(tabLabels.map((t) => t.id));

  const openCount = issues.filter((i) => i.status === 'open').length;
  const fixedCount = issues.filter((i) => i.status === 'fixed' || i.status === 'verified').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                {report.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  {report.report_type}
                </Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(report.created_at)}</span>
                <StatusBadge status={report.report_status || 'draft'} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/reports/${report.share_token}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link copied');
                }}
                className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <span className="material-symbols-outlined text-[12px] mr-1">link</span>
                Copy Share Link
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportReportToPDF({
                      name: report.name,
                      reportData: data,
                      shareToken: report.share_token,
                    });
                    toast.success('PDF downloaded');
                  } catch { toast.error('PDF export failed'); }
                  finally { setExporting(false); }
                }}
                disabled={exporting}
                className="h-7 px-3 text-xs bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
              >
                <span className="material-symbols-outlined text-[12px] mr-1">picture_as_pdf</span>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-0 px-6 border-b border-border shrink-0 overflow-x-auto">
          {tabLabels.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                  activeTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Request info */}
              <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg border border-border">
                <span className="font-mono text-sm font-bold" style={{ color: METHOD_COLORS[data.request?.method] || '#64748B' }}>
                  {data.request?.method}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{data.request?.name}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{data.request?.url}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(data.ranAt).toLocaleString()}</span>
              </div>

              {/* Health score */}
              <div className="grid grid-cols-4 gap-4">
                <HealthCard label="Health Score" value={`${report.overall_health_score ?? data.healthScore ?? '—'}`} suffix="/ 100" color={getHealthColor(report.overall_health_score ?? data.healthScore ?? 0)} />
                <HealthCard label="Open Issues" value={String(openCount)} color="#EF4444" />
                <HealthCard label="Resolved" value={String(fixedCount)} color="#10B981" />
                <HealthCard label="Total Issues" value={String(issues.length)} color="#6366F1" />
              </div>

              {/* Test sections summary */}
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Test Results</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(sections).map(([key, val]) => (
                    <SectionSummaryCard key={key} section={key} data={val} />
                  ))}
                </div>
              </div>

              {/* Issues list */}
              {issues.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Issue Checklist</h3>
                    <div className="flex gap-2 text-xs">
                      <span className="text-[#EF4444] font-mono">{issues.filter((i) => i.severity === 'critical').length} critical</span>
                      <span className="text-[#F59E0B] font-mono">{issues.filter((i) => i.severity === 'warning').length} warnings</span>
                    </div>
                  </div>
                  <div className="space-y-1 border border-border rounded-lg overflow-hidden">
                    {issues.map((issue, idx) => {
                      const isExpanded = expandedIssues.has(idx);
                      const rem = issue.remediation;
                      return (
                        <div key={idx} className="bg-card hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                          <button
                            onClick={() => {
                              const next = new Set(expandedIssues);
                              if (next.has(idx)) next.delete(idx); else next.add(idx);
                              setExpandedIssues(next);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                          >
                            <SeverityIcon severity={issue.severity} />
                            <span className="text-xs text-muted-foreground w-20 shrink-0">{SECTION_LABELS[issue.section] || issue.section}</span>
                            <span className="text-xs text-foreground flex-1">{issue.title}</span>
                            <span className="material-symbols-outlined text-[14px] text-muted-foreground shrink-0 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                              expand_more
                            </span>
                            <IssueStatusBadge status={issue.status} />
                          </button>
                          {isExpanded && (
                            <div className="px-11 pb-3 border-t border-border/30 bg-background/30">
                              <p className="text-xs text-muted-foreground pt-3 leading-relaxed">{issue.description}</p>
                              {rem && (
                                <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-[14px] text-primary">lightbulb</span>
                                    <span className="text-xs font-bold text-primary">{rem.summary}</span>
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ml-auto ${
                                      rem.urgency === 'immediate' ? 'text-[#EF4444] bg-[rgba(239,68,68,0.1)]' :
                                      rem.urgency === 'recommended' ? 'text-[#F59E0B] bg-[rgba(245,158,11,0.1)]' : 'text-[#6366F1] bg-[rgba(99,102,241,0.1)]'
                                    }`}>{rem.urgency}</span>
                                  </div>
                                  <ol className="space-y-1.5 pl-5 list-decimal">
                                    {rem.steps.map((step, si) => (
                                      <li key={si} className="text-xs text-foreground/80 leading-relaxed">{step}</li>
                                    ))}
                                  </ol>
                                  {rem.reference && (
                                    <a href={rem.reference} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary hover:underline">
                                      <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                      Reference
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'benchmarks' && sections.benchmarks && (
            <BenchmarksSection result={sections.benchmarks} />
          )}
          {activeTab === 'security' && sections.security && (
            <SecuritySection result={sections.security} />
          )}
          {activeTab === 'fuzz' && sections.fuzz && (
            <FuzzSection results={sections.fuzz} />
          )}
          {activeTab === 'chaos' && sections.chaos && (
            <ChaosSection results={sections.chaos} />
          )}
          {activeTab === 'idempotency' && sections.idempotency && (
            <IdempotencySection result={sections.idempotency} />
          )}
          {activeTab === 'regression' && sections.regression && (
            <RegressionSection diffs={sections.regression.diffs} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ────────────────────────────────────────

function HealthCard({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color: string }) {
  return (
    <div className="bg-muted/20 border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold font-mono" style={{ color }}>{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionSummaryCard({ section, data }: { section: string; data: unknown }) {
  const getSummary = (): { label: string; value: string; color: string } => {
    switch (section) {
      case 'benchmarks': {
        const b = data as any;
        return { label: 'Benchmarks', value: `avg ${b?.stats?.avgLatency ?? '—'}ms`, color: '#6366F1' };
      }
      case 'security': {
        const s = data as any;
        return { label: 'Security', value: `${s?.healthScore ?? '—'}/100`, color: '#F59E0B' };
      }
      case 'fuzz': {
        const f = data as any[];
        const safe = f?.reduce((s: number, r: any) => s + r.safe, 0) ?? 0;
        const total = f?.reduce((s: number, r: any) => s + r.total, 0) ?? 0;
        return { label: 'Fuzz', value: `${safe}/${total} safe`, color: total > 0 && safe === total ? '#10B981' : '#F59E0B' };
      }
      case 'chaos': {
        const c = data as any[];
        const passed = c?.filter((r: any) => r.status === 'passed').length ?? 0;
        return { label: 'Chaos', value: `${passed}/${c?.length ?? 0} passed`, color: passed === (c?.length ?? 0) ? '#10B981' : '#F59E0B' };
      }
      case 'idempotency': {
        const i = data as any;
        return { label: 'Idempotency', value: i?.isIdempotent ? 'Pass' : 'Fail', color: i?.isIdempotent ? '#10B981' : '#EF4444' };
      }
      case 'regression': {
        const r = data as any;
        const diffs = r?.diffs?.length ?? 0;
        return { label: 'Regression', value: `${diffs} diff(s)`, color: diffs === 0 ? '#10B981' : '#F59E0B' };
      }
      default:
        return { label: section, value: '—', color: '#64748B' };
    }
  };

  const s = getSummary();
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border border-border rounded-lg">
      <span className="text-xs font-semibold text-foreground">{s.label}</span>
      <span className="text-xs font-mono font-bold" style={{ color: s.color }}>{s.value}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  const color = severity === 'critical' ? '#EF4444' : severity === 'warning' ? '#F59E0B' : '#6366F1';
  const icon = severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info';
  return <span className="material-symbols-outlined text-[16px] shrink-0" style={{ color }}>{icon}</span>;
}

function IssueStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: '#EF4444' },
    acknowledged: { label: 'Acknowledged', color: '#F59E0B' },
    fixed: { label: 'Fixed', color: '#6366F1' },
    verified: { label: 'Verified', color: '#10B981' },
  };
  const c = config[status] || config.open;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: c.color, backgroundColor: `${c.color}15` }}>{c.label}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#64748B' },
    shared: { label: 'Shared', color: '#6366F1' },
    'in-review': { label: 'In Review', color: '#F59E0B' },
    resolved: { label: 'Resolved', color: '#10B981' },
    passed: { label: 'Passed', color: '#10B981' },
  };
  const c = config[status] || config.draft;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded border" style={{ color: c.color, borderColor: c.color }}>{c.label}</span>
  );
}

// ─── Section Views ─────────────────────────────────────────

function BenchmarksSection({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="p50" value={`${result.stats?.p50 ?? '—'}ms`} />
        <MiniStat label="p95" value={`${result.stats?.p95 ?? '—'}ms`} />
        <MiniStat label="p99" value={`${result.stats?.p99 ?? '—'}ms`} />
        <MiniStat label="Throughput" value={`${result.stats?.throughput ?? '—'} req/s`} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="Avg Latency" value={`${result.stats?.avgLatency ?? '—'}ms`} />
        <MiniStat label="Min" value={`${result.stats?.minLatency ?? '—'}ms`} />
        <MiniStat label="Max" value={`${result.stats?.maxLatency ?? '—'}ms`} />
        <MiniStat label="Success Rate" value={`${result.stats?.successRate ?? '—'}%`} color={result.stats?.successRate >= 95 ? '#10B981' : '#EF4444'} />
      </div>
      <p className="text-xs text-muted-foreground">{result.iterations?.length ?? 0} iterations in {result.stats?.totalTime ?? '—'}ms</p>
    </div>
  );
}

function SecuritySection({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="Health" value={`${result.healthScore ?? '—'}/100`} color="#6366F1" />
        <MiniStat label="Vulnerabilities" value={String(result.vulnerabilities ?? 0)} color="#EF4444" />
        <MiniStat label="Warnings" value={String(result.warnings ?? 0)} color="#F59E0B" />
        <MiniStat label="Checks" value={String(result.totalChecks ?? 0)} />
      </div>
      <div className="space-y-1 border border-border rounded-lg overflow-hidden">
        {result.checks?.map((check: any) => (
          <div key={check.id} className="flex items-center gap-3 px-4 py-2.5 bg-card hover:bg-muted/30 border-b border-border last:border-0">
            <SeverityIcon severity={check.status === 'fail' ? 'critical' : check.status === 'warning' ? 'warning' : 'info'} />
            <span className="text-xs text-foreground flex-1">{check.label}</span>
            <span className="text-xs font-mono text-muted-foreground max-w-[300px] truncate" title={check.detail}>{check.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FuzzSection({ results }: { results: any[] }) {
  return (
    <div className="space-y-3">
      {results.map((r: any) => (
        <div key={r.strategy} className="bg-muted/20 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">{r.strategy}</span>
            <span className="text-xs text-muted-foreground">{r.total} iterations</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Safe" value={String(r.safe)} color="#10B981" />
            <MiniStat label="Crashes" value={String(r.crash)} color="#EF4444" />
            <MiniStat label="Timeouts" value={String(r.timeout)} color="#F59E0B" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChaosSection({ results }: { results: any[] }) {
  const passed = results.filter((r: any) => r.status === 'passed').length;
  const dropped = results.filter((r: any) => r.status === 'dropped').length;
  const failed = results.filter((r: any) => r.status === 'failed').length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Passed" value={String(passed)} color="#10B981" />
        <MiniStat label="Dropped" value={String(dropped)} color="#F59E0B" />
        <MiniStat label="Failed" value={String(failed)} color="#EF4444" />
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">#</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Injected Latency</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Response</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Total Time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono">{i + 1}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs font-bold" style={{ color: r.status === 'passed' ? '#10B981' : r.status === 'dropped' ? '#F59E0B' : '#EF4444' }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono">{r.injectedLatencyMs}ms</td>
                  <td className="px-4 py-2 font-mono">{r.responseStatus || '—'}</td>
                  <td className="px-4 py-2 font-mono">{r.totalTimeMs || '—'}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IdempotencySection({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border" style={{
        borderColor: result.isIdempotent ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
        backgroundColor: result.isIdempotent ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
      }}>
        <span className="material-symbols-outlined text-2xl" style={{ color: result.isIdempotent ? '#10B981' : '#EF4444' }}>
          {result.isIdempotent ? 'check_circle' : 'cancel'}
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">{result.isIdempotent ? 'Request is Idempotent' : 'Request is NOT Idempotent'}</p>
          <p className="text-xs text-muted-foreground">Status: {result.status1} vs {result.status2} | Latency: {result.latency1}ms vs {result.latency2}ms</p>
        </div>
      </div>
      {result.diffs?.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted/20 border-b border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase">{result.diffs.length} Differences Found</span>
          </div>
          <div className="divide-y divide-border">
            {result.diffs.map((diff: any, i: number) => (
              <div key={i} className="px-4 py-2 text-xs">
                <span className="font-mono text-muted-foreground">{diff.path?.join('.') || '(root)'}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="font-mono" style={{ color: diff.kind === 'A' ? '#10B981' : diff.kind === 'D' ? '#EF4444' : '#F59E0B' }}>
                  {diff.lhs !== undefined ? String(diff.lhs).slice(0, 40) : '(none)'}
                  {diff.lhs !== undefined && diff.rhs !== undefined && ' → '}
                  {diff.rhs !== undefined ? String(diff.rhs).slice(0, 40) : '(none)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegressionSection({ diffs }: { diffs: any[] }) {
  return (
    <div className="space-y-4">
      {diffs.length === 0 ? (
        <div className="flex items-center gap-2 p-4 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] rounded-lg text-[#10B981]">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          <span className="text-sm font-semibold">No changes detected from baseline</span>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted/20 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">{diffs.length} Changes Detected</span>
          </div>
          <div className="divide-y divide-border">
            {diffs.map((diff: any, i: number) => (
              <div key={i} className="px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-muted-foreground">{diff.path || '(root)'}</span>
                  <span className={`text-xs font-bold uppercase ${diff.kind === 'added' ? 'text-[#10B981]' : diff.kind === 'removed' ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                    {diff.kind}
                  </span>
                </div>
                <div className="flex gap-2 pl-2">
                  {diff.lhs !== undefined && <span className="font-mono text-[#EF4444] bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 rounded">{diff.lhs}</span>}
                  {diff.lhs !== undefined && diff.rhs !== undefined && <span className="text-muted-foreground">→</span>}
                  {diff.rhs !== undefined && <span className="font-mono text-[#10B981] bg-[rgba(16,185,129,0.1)] px-1.5 py-0.5 rounded">{diff.rhs}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted/20 border border-border rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">{label}</p>
      <p className="text-lg font-bold font-mono" style={{ color: color || 'var(--foreground)' }}>{value}</p>
    </div>
  );
}

function getHealthColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
