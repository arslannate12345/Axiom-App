'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReportRecord } from '@/lib/supabase-service';

import { METHOD_COLORS } from '@/lib/constants';

interface ReportDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportRecord | null;
}

export function ReportDetailDialog({ open, onOpenChange, report }: ReportDetailDialogProps) {
  if (!report) return null;

  const data = report.report_data as {
    summary?: {
      passed: number;
      failed: number;
      total: number;
      duration: number;
    };
    steps?: {
      name: string;
      method: string;
      url: string;
      status: string;
      latencyMs?: number;
      statusCode?: number;
      error?: string;
      assertionFailures?: string[];
      extractions?: Record<string, string>;
    }[];
  };

  const summary = data?.summary;
  const steps = data?.steps ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                {report.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="text-[12px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  {report.report_type}
                </Badge>
                <span className="text-[12px] text-muted-foreground">{timeAgo(report.created_at)}</span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/reports/${report.share_token}`;
                navigator.clipboard.writeText(url);
              }}
              className="h-7 px-3 text-[12px] bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <span className="material-symbols-outlined text-[12px] mr-1">link</span>
              Copy Share Link
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <SummaryCard label="Total" value={String(summary.total)} color="#6366F1" />
              <SummaryCard label="Passed" value={String(summary.passed)} color="#10B981" />
              <SummaryCard label="Failed" value={String(summary.failed)} color="#EF4444" />
              <SummaryCard label="Duration" value={`${summary.duration}ms`} color="#F59E0B" />
            </div>
          )}

          {/* Steps table */}
          {steps.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                  Steps ({steps.length})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Method</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">URL</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Latency</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2">
                          <span className="font-mono text-[12px] font-bold" style={{ color: METHOD_COLORS[step.method] || '#64748B' }}>
                            {step.method}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-medium truncate max-w-[120px]">{step.name}</td>
                        <td className="px-4 py-2 font-mono text-muted-foreground truncate max-w-[200px]">{step.url}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={step.status} />
                        </td>
                        <td className="px-4 py-2 font-mono">
                          {step.latencyMs ? `${step.latencyMs}ms` : '—'}
                        </td>
                        <td className="px-4 py-2 font-mono">
                          {step.statusCode ? (
                            <span style={{ color: step.statusCode < 400 ? '#10B981' : '#EF4444' }}>
                              {step.statusCode}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {steps.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-muted-foreground text-3xl block mb-2">summarize</span>
              <p className="text-xs text-muted-foreground">No step data in this report</p>
            </div>
          )}

          {/* Assertion failures */}
          {steps.some((s) => s.assertionFailures && s.assertionFailures.length > 0) && (
            <div className="border border-border rounded-lg overflow-hidden mt-6">
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                  Assertion Results
                </h4>
              </div>
              <div className="p-4">
                {steps.filter((s) => s.assertionFailures && s.assertionFailures.length > 0).map((step, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <p className="text-[12px] font-bold text-foreground mb-1">{step.name}</p>
                    {step.assertionFailures?.map((f, j) => (
                      <p key={j} className="text-[12px] text-[#EF4444] font-mono pl-2">&#x2717; {f}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extractions */}
          {steps.some((s) => s.extractions && Object.keys(s.extractions).length > 0) && (
            <div className="border border-border rounded-lg overflow-hidden mt-6">
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                  Extractions
                </h4>
              </div>
              <div className="p-4">
                {steps.filter((s) => s.extractions && Object.keys(s.extractions).length > 0).map((step, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <p className="text-[12px] font-bold text-foreground mb-1">{step.name}</p>
                    <div className="space-y-1">
                      {Object.entries(step.extractions ?? {}).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-[12px] pl-2">
                          <span className="font-mono text-primary shrink-0">{`{{${key}}}`}</span>
                          <span className="font-mono text-muted-foreground truncate">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-muted/20 border border-border rounded-lg p-3">
      <p className="text-[12px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    passed: { color: '#10B981', bg: 'bg-[#10B981]/10', label: 'Pass' },
    failed: { color: '#EF4444', bg: 'bg-[#EF4444]/10', label: 'Fail' },
    pending: { color: '#64748B', bg: 'bg-muted/20', label: 'Pending' },
    skipped: { color: '#F59E0B', bg: 'bg-[#F59E0B]/10', label: 'Skip' },
  };
  const c = config[status] ?? config.pending;
  return (
    <span
      className="text-[12px] font-bold px-1.5 py-0.5 rounded uppercase"
      style={{ color: c.color, backgroundColor: undefined }}
    >
      {c.label}
    </span>
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
