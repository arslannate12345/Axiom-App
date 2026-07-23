'use client';

import type { LoadAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';

interface LoadTestResultsProps {
  audit: LoadAudit;
}

export function LoadTestResults({ audit }: LoadTestResultsProps) {
  const { summary, statusBreakdown, iterations } = audit;
  const statusMap = statusBreakdown || (audit as any).status_breakdown || {};
  const iterationsList = iterations || (audit as any).iterations || [];

  return (
    <div className="space-y-6">
      {/* Latency Percentiles Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-card border border-border/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">p50 Latency</span>
          <span className="text-xl font-black text-foreground mt-1 block">{summary?.p50Ms ?? 0}ms</span>
          <span className="text-[11px] text-muted-foreground">Median response time</span>
        </div>

        <div className="bg-white dark:bg-card border border-border/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">p95 Latency</span>
          <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">{summary?.p95Ms ?? 0}ms</span>
          <span className="text-[11px] text-muted-foreground">95% requests faster than</span>
        </div>

        <div className="bg-white dark:bg-card border border-border/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">p99 Latency</span>
          <span className="text-xl font-black text-rose-500 mt-1 block">{summary?.p99Ms ?? 0}ms</span>
          <span className="text-[11px] text-muted-foreground">99% requests faster than</span>
        </div>

        <div className="bg-white dark:bg-card border border-border/80 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Throughput</span>
          <span className="text-xl font-black text-emerald-500 mt-1 block">{summary?.throughputRps ?? 0} RPS</span>
          <span className="text-[11px] text-muted-foreground">Requests per second</span>
        </div>
      </div>

      {/* HTTP Status Breakdown */}
      <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-500 text-lg">pie_chart</span>
          HTTP Status Code Distribution
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusMap || {}).map(([status, count]) => {
            const is2xx = status.startsWith('2');
            const is4xx = status.startsWith('4');
            const is5xx = status.startsWith('5') || status === '0';
            return (
              <div
                key={status}
                className={cn(
                  'px-3 py-2 rounded-lg border font-mono text-xs flex items-center gap-2',
                  is2xx ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                  is4xx ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                  'bg-red-500/10 border-red-500/20 text-red-500'
                )}
              >
                <span className="font-bold">{status === '0' ? 'TIMEOUT' : `HTTP ${status}`}:</span>
                <span>{count as number} requests</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Iterations Log Sample */}
      <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-500 text-lg">list_alt</span>
          Sample Request Iterations ({iterationsList.length} Total)
        </h3>
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {iterationsList.slice(0, 15).map((it, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 text-xs font-mono">
              <span className="text-muted-foreground">Iter #{it.iteration}</span>
              <span className="text-foreground">{it.latencyMs}ms</span>
              <span className={cn('px-1.5 py-0.5 rounded font-bold text-[10px]', it.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                {it.statusCode || 'TIMEOUT'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
