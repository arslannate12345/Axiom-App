import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { Metadata } from 'next';
import type { AggregatedReport } from '@/lib/reportGenerator';

export const metadata: Metadata = { title: 'Axiom Report' };

import { METHOD_COLORS } from '@/lib/constants';

const SECTION_LABELS: Record<string, string> = {
  benchmarks: 'Benchmarks',
  security: 'Security',
  fuzz: 'Fuzzing',
  chaos: 'Chaos',
  idempotency: 'Idempotency',
  regression: 'Regression',
};

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: report } = await supabase.rpc('get_shared_report', { token });

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-muted-foreground block mb-3">description</span>
          <h1 className="text-lg font-bold text-foreground mb-2">Report Not Found</h1>
          <p className="text-sm text-muted-foreground">This report link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const data = report.report_data as AggregatedReport;
  const sections = data?.sections ?? {};
  const issues = data?.issues ?? [];
  const healthScore = report.overall_health_score ?? data?.healthScore ?? 0;
  const openCount = issues.filter((i: any) => i.status === 'open').length;
  const fixedCount = issues.filter((i: any) => i.status === 'fixed' || i.status === 'verified').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-foreground text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground uppercase tracking-tighter">Axiom Report</h1>
              <p className="text-xs text-muted-foreground font-mono">{new Date(report.created_at).toLocaleString()}</p>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mt-4 mb-2">{report.name}</h2>

          {/* Request info */}
          {data?.request && (
            <div className="flex items-center gap-3 mt-4">
              <span className="font-mono text-sm font-bold px-2 py-1 rounded" style={{ color: METHOD_COLORS[data.request.method] || '#64748B', backgroundColor: `${METHOD_COLORS[data.request.method] || '#64748B'}15` }}>
                {data.request.method}
              </span>
              <span className="text-sm font-mono text-foreground truncate">{data.request.url}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <StatusBadge status={report.report_status || 'draft'} />
            {healthScore > 0 && (
              <span className={`text-sm font-bold font-mono ${healthScore >= 80 ? 'text-[#10B981]' : healthScore >= 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                Health: {healthScore}/100
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Health Score" value={`${healthScore}`} suffix="/ 100" color={healthScore >= 80 ? '#10B981' : healthScore >= 50 ? '#F59E0B' : '#EF4444'} />
          <StatCard label="Open Issues" value={String(openCount)} color="#EF4444" />
          <StatCard label="Resolved" value={String(fixedCount)} color="#10B981" />
          <StatCard label="Total Issues" value={String(issues.length)} color="#6366F1" />
        </div>

        {/* Test results sections */}
        {Object.keys(sections).length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Test Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.benchmarks && (
                <SectionCard label="Benchmarks" icon="speed">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label="p50" value={`${(sections.benchmarks as any).stats?.p50 ?? '—'}ms`} />
                    <MiniStat label="p99" value={`${(sections.benchmarks as any).stats?.p99 ?? '—'}ms`} />
                    <MiniStat label="Throughput" value={`${(sections.benchmarks as any).stats?.throughput ?? '—'} req/s`} />
                    <MiniStat label="Success Rate" value={`${(sections.benchmarks as any).stats?.successRate ?? '—'}%`} />
                  </div>
                </SectionCard>
              )}
              {sections.security && (
                <SectionCard label="Security" icon="security">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label="Health" value={`${(sections.security as any).healthScore ?? '—'}/100`} />
                    <MiniStat label="Vulnerabilities" value={String((sections.security as any).vulnerabilities ?? 0)} color="#EF4444" />
                    <MiniStat label="Warnings" value={String((sections.security as any).warnings ?? 0)} color="#F59E0B" />
                    <MiniStat label="Checks" value={String((sections.security as any).totalChecks ?? 0)} />
                  </div>
                </SectionCard>
              )}
              {sections.fuzz && (
                <SectionCard label="Fuzzing" icon="shuffle">
                  <div className="space-y-1">
                    {(sections.fuzz as any[]).map((r: any) => (
                      <div key={r.strategy} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{r.strategy}</span>
                        <span>
                          <span className="text-[#10B981] font-mono">{r.safe}</span>
                          <span className="text-muted-foreground">/{r.total} safe</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
              {sections.chaos && (
                <SectionCard label="Chaos" icon="flash_on">
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Passed" value={String((sections.chaos as any[]).filter((r: any) => r.status === 'passed').length)} color="#10B981" />
                    <MiniStat label="Dropped" value={String((sections.chaos as any[]).filter((r: any) => r.status === 'dropped').length)} color="#F59E0B" />
                    <MiniStat label="Failed" value={String((sections.chaos as any[]).filter((r: any) => r.status === 'failed').length)} color="#EF4444" />
                  </div>
                </SectionCard>
              )}
              {sections.idempotency && (
                <SectionCard label="Idempotency" icon="balance">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl" style={{ color: (sections.idempotency as any).isIdempotent ? '#10B981' : '#EF4444' }}>
                      {(sections.idempotency as any).isIdempotent ? 'check_circle' : 'cancel'}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{(sections.idempotency as any).isIdempotent ? 'Idempotent' : 'Not Idempotent'}</p>
                      <p className="text-xs text-muted-foreground">{(sections.idempotency as any).diffs?.length ?? 0} difference(s)</p>
                    </div>
                  </div>
                </SectionCard>
              )}
              {sections.regression && (
                <SectionCard label="Regression" icon="history">
                  <p className="text-sm font-bold" style={{ color: (sections.regression as any).diffs?.length === 0 ? '#10B981' : '#F59E0B' }}>
                    {(sections.regression as any).diffs?.length ?? 0} change(s) detected
                  </p>
                </SectionCard>
              )}
            </div>
          </div>
        )}

        {/* Issues checklist */}
        {issues.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Issue Checklist</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">#</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Section</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Issue</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Severity</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {issues.map((issue: any, idx: number) => (
                      <>
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{SECTION_LABELS[issue.section] || issue.section}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">{issue.title}</span>
                          {issue.description && <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                            color: issue.severity === 'critical' ? '#EF4444' : issue.severity === 'warning' ? '#F59E0B' : '#6366F1',
                            backgroundColor: issue.severity === 'critical' ? 'rgba(239,68,68,0.1)' : issue.severity === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                          }}>{issue.severity}</span>
                        </td>
                        <td className="px-4 py-3">
                          <IssueStatusBadge status={issue.status || 'open'} />
                        </td>
                      </tr>
                      {issue.remediation && (
                        <tr key={`${idx}-fix`} className="bg-primary/5">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="material-symbols-outlined text-[14px] text-primary">lightbulb</span>
                              <span className="text-xs font-bold text-primary">{issue.remediation.summary}</span>
                            </div>
                            <ol className="space-y-1 pl-8 list-decimal">
                              {issue.remediation.steps?.map((step: string, si: number) => (
                                <li key={si} className="text-xs text-muted-foreground leading-relaxed">{step}</li>
                              ))}
                            </ol>
                            {issue.remediation.reference && (
                              <a href={issue.remediation.reference} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary hover:underline">
                                <span>↗</span> Reference
                              </a>
                            )}
                          </td>
                        </tr>
                      )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground font-mono">Generated by Axiom — API Testing & QA Platform</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color?: string }) {
  return (
    <div className="bg-card border border-border p-5 rounded-lg text-center">
      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline justify-center gap-1">
        <p className="text-2xl font-bold font-mono" style={{ color: color || 'var(--foreground)' }}>{value}</p>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionCard({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[16px] text-primary">{icon}</span>
        <h4 className="text-sm font-bold text-foreground">{label}</h4>
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted/10 border border-border/50 rounded p-2 text-center">
      <p className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{label}</p>
      <p className="text-sm font-bold font-mono" style={{ color: color || 'var(--foreground)' }}>{value}</p>
    </div>
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
    <span className="text-xs px-2 py-0.5 rounded border font-semibold" style={{ color: c.color, borderColor: c.color }}>{c.label}</span>
  );
}

function IssueStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: '#EF4444' },
    acknowledged: { label: 'Acknowledged', color: '#F59E0B' },
    fixed: { label: 'Fixed', color: '#6366F1' },
    verified: { label: 'Verified', color: '#10B981' },
  };
  const c = config[status] || { label: status, color: '#64748B' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: c.color, backgroundColor: `${c.color}15` }}>{c.label}</span>
  );
}
