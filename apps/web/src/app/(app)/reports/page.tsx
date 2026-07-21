'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ReportComparison } from '@/components/reports/ReportComparison';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import { compareReports } from '@/lib/reportCompare';
import type { ReportRecord } from '@/lib/supabase-service';
import type { AggregatedReport } from '@/lib/reportGenerator';
import type { ComparisonResult } from '@/lib/reportCompare';

import { METHOD_COLORS } from '@/lib/constants';

export default function ReportsDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [viewing, setViewing] = useState<ReportRecord | null>(null);
  const [comparing, setComparing] = useState<ComparisonResult | null>(null);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const data = await service.getUserReports();
    setReports(data);
  };

  const handleCompareWithBaseline = async (report: ReportRecord) => {
    if (!report.baseline_report_id) {
      toast.error('No baseline report to compare with');
      return;
    }
    const baseline = await service.getReportById(report.baseline_report_id);
    if (!baseline) {
      toast.error('Baseline report not found');
      return;
    }
    const current = report.report_data as AggregatedReport;
    const prev = baseline.report_data as AggregatedReport;
    const result = compareReports(prev, current);
    setComparing(result);
  };

  const handleComparePrevious = async (report: ReportRecord) => {
    const requestReports = await service.getReportsByRequestId(report.request_id || '');
    if (requestReports.length < 2) {
      toast.error('Need at least 2 reports to compare');
      return;
    }
    const currentIdx = requestReports.findIndex((r) => r.id === report.id);
    const prevReport = requestReports[currentIdx + 1];
    if (!prevReport) {
      toast.error('No previous report found');
      return;
    }
    const current = report.report_data as AggregatedReport;
    const prev = prevReport.report_data as AggregatedReport;
    const result = compareReports(prev, current);
    setComparing(result);
  };

  const totalReports = reports.length;
  const passedReports = reports.filter((r) => r.report_status === 'passed').length;
  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + (r.report_data as any)?.healthScore || 0, 0) / reports.length)
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Reports</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage and compare test reports for your API requests.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <StatBadge label="Total Reports" value={String(totalReports)} color="#6366F1" />
          <StatBadge label="Passed" value={String(passedReports)} color="#10B981" />
          <StatBadge label="Avg Health" value={`${avgScore}/100`} color="#F59E0B" />
        </div>
      </div>

      {/* Reports list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <span className="material-symbols-outlined text-5xl mb-3">description</span>
            <p className="text-sm font-medium">No reports yet</p>
            <p className="text-xs mt-1">Run tests and generate a report to see it here.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Report</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Request</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Health</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Issues</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {reports.map((r) => {
                    const data = r.report_data as AggregatedReport;
                    const issues = data?.issues ?? [];
                    const openCount = issues.filter((i: any) => i.status === 'open').length;
                    const health = data?.healthScore ?? 0;
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-primary">description</span>
                            <div>
                              <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{r.name}</p>
                              <Badge className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20 capitalize mt-0.5">
                                {r.report_type}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {data?.request && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold" style={{ color: METHOD_COLORS[data.request.method] || '#64748B' }}>
                                {data.request.method}
                              </span>
                              <span className="text-muted-foreground truncate max-w-[160px]">{data.request.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono font-bold ${health >= 80 ? 'text-[#10B981]' : health >= 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                            {health}/100
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {openCount > 0 && <span className="text-xs font-mono text-[#EF4444]">{openCount} open</span>}
                            {openCount === 0 && issues.length > 0 && <span className="text-xs text-[#10B981] font-mono">all clear</span>}
                            {issues.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ReportStatusBadge status={r.report_status || 'draft'} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {timeAgo(r.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setViewing(r)}
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              title="View"
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                            </button>
                            <button
                              onClick={() => handleComparePrevious(r)}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                              title="Compare with previous"
                            >
                              <span className="material-symbols-outlined text-[14px]">compare_arrows</span>
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/reports/${r.share_token}`);
                                toast.success('Link copied');
                              }}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                              title="Copy link"
                            >
                              <span className="material-symbols-outlined text-[14px]">link</span>
                            </button>
                            <button
                              onClick={async () => { await service.deleteReport(r.id); loadReports(); toast.success('Deleted'); }}
                              className="p-1.5 text-muted-foreground hover:text-[#EF4444] transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ReportViewer open={viewing !== null} onOpenChange={(o) => { if (!o) setViewing(null); }} report={viewing} />
      <ReportComparison open={comparing !== null} onOpenChange={(o) => { if (!o) setComparing(null); }} comparison={comparing} />
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#64748B' },
    shared: { label: 'Shared', color: '#6366F1' },
    'in-review': { label: 'In Review', color: '#F59E0B' },
    resolved: { label: 'Resolved', color: '#10B981' },
    passed: { label: 'Passed', color: '#10B981' },
  };
  const c = config[status] || config.draft;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded border" style={{ color: c.color, borderColor: `${c.color}66` }}>{c.label}</span>
  );
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
