'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLoadAuditById } from '@/lib/load-service';
import type { LoadAudit } from '@axiom/core/types';
import { LoadTestResults } from '@/components/load/LoadTestResults';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function LoadReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [audit, setAudit] = useState<LoadAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      getLoadAuditById(params.id).then((data) => {
        setAudit(data);
        setIsLoading(false);
      });
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <span className="material-symbols-outlined text-4xl mb-4 text-red-500">error</span>
        <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
        <p className="text-muted-foreground mb-6">The requested Load & Stress test report could not be found.</p>
        <Link
          href="/load/reports"
          className="h-10 px-4 rounded-xl bg-purple-600 text-white font-bold text-sm flex items-center gap-2"
        >
          Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      <header className="shrink-0 p-6 border-b border-border bg-card/50 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500 text-lg">dataset_linked</span>
                <h1 className="text-xl font-bold text-foreground font-mono truncate max-w-[400px]">
                  {audit.url}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>Load & Resilience Audit</span>
                <span>•</span>
                <span>{format(new Date(audit.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl font-black text-sm border bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400">
            Grade {audit.grade}
          </div>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Overview Score Row */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Resilience & Speed Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{audit.score}</span>
                  <span className="text-sm font-bold text-muted-foreground">/ 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate max-w-xs">{audit.url}</p>
              </div>

              <div className="w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-black text-purple-600 dark:text-purple-400 bg-white dark:bg-purple-950/40 border-purple-500/40 shadow-sm">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">Grade</span>
                <span className="text-3xl">{audit.grade}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Virtual Users</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {audit.config.virtualUsers}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">VU</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Simulated load</span>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Throughput</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-emerald-500">
                  {audit.summary.throughputRps}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">RPS</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 font-mono">
                p95: {audit.summary.p95Ms}ms
              </span>
            </div>
          </motion.div>

          {/* Results Component */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500">analytics</span>
              Latency Percentiles & Iterations Breakdown
            </h3>
            <LoadTestResults audit={audit} />
          </div>
        </div>
      </div>
    </div>
  );
}
