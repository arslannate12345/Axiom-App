'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ComparisonResult } from '@/lib/reportCompare';

interface ReportComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparison: ComparisonResult | null;
}

export function ReportComparison({ open, onOpenChange, comparison }: ReportComparisonProps) {
  if (!comparison) return null;

  const fixed = comparison.issues.filter((i) => i.change === 'fixed').length;
  const improved = comparison.issues.filter((i) => i.change === 'improved').length;
  const unchanged = comparison.issues.filter((i) => i.change === 'unchanged').length;
  const newIssues = comparison.issues.filter((i) => i.change === 'new').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">compare_arrows</span>
            Report Comparison
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Health score comparison */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Previous Health</p>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color: getHealthColor(comparison.baselineHealth) }}>
                {comparison.baselineHealth}/100
              </p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(comparison.baselineDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current Health</p>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color: getHealthColor(comparison.currentHealth) }}>
                {comparison.currentHealth}/100
              </p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(comparison.currentDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Delta</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${comparison.healthDelta > 0 ? 'text-[#10B981]' : comparison.healthDelta < 0 ? 'text-[#EF4444]' : 'text-muted-foreground'}`}>
                {comparison.healthDelta > 0 ? '+' : ''}{comparison.healthDelta}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/20 border border-border rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold font-mono text-[#10B981]">{fixed}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Fixed</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-[#6366F1]">{improved}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Improved</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-[#F59E0B]">{unchanged}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Unchanged</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-[#EF4444]">{newIssues}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">New</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-foreground font-medium">{comparison.summary}</p>

          {/* Issues comparison table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-muted/20 border-b border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Issue Timeline</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Issue</th>
                    <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Section</th>
                    <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Severity</th>
                    <th className="text-center px-4 py-2 text-xs font-bold text-muted-foreground uppercase w-20">Baseline</th>
                    <th className="text-center px-4 py-2 text-xs font-bold text-muted-foreground uppercase w-20">Current</th>
                    <th className="text-center px-4 py-2 text-xs font-bold text-muted-foreground uppercase w-20">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {comparison.issues.map((issue, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-foreground">{issue.title}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{issue.section}</td>
                      <td className="px-4 py-2.5">
                        <SeverityBadge severity={issue.severity} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {issue.baselineStatus ? (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>Open</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusTag status={issue.currentStatus} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <ChangeTag change={issue.change} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getHealthColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === 'critical' ? '#EF4444' : severity === 'warning' ? '#F59E0B' : '#6366F1';
  return (
    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}15` }}>
      {severity}
    </span>
  );
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: '#EF4444' },
    acknowledged: { label: 'Ack', color: '#F59E0B' },
    fixed: { label: 'Fixed', color: '#6366F1' },
    verified: { label: 'Verified', color: '#10B981' },
  };
  const c = map[status] || { label: status, color: '#64748B' };
  return (
    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: c.color, backgroundColor: `${c.color}15` }}>
      {c.label}
    </span>
  );
}

function ChangeTag({ change }: { change: string }) {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    fixed: { label: 'Fixed', color: '#10B981', icon: 'check_circle' },
    improved: { label: 'Improved', color: '#6366F1', icon: 'trending_up' },
    unchanged: { label: '—', color: '#64748B', icon: '' },
    new: { label: 'New', color: '#EF4444', icon: 'fiber_new' },
  };
  const c = map[change] || { label: change, color: '#64748B', icon: '' };
  return (
    <span className="text-xs font-bold" style={{ color: c.color }}>
      {c.icon && <span className="material-symbols-outlined text-[14px] mr-0.5 align-text-bottom">{c.icon}</span>}
      {c.label}
    </span>
  );
}
