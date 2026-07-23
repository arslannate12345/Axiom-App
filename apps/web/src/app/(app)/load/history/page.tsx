'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getLoadHistory } from '@/lib/load-service';
import type { LoadAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'B':
      return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'C':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'D':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    default:
      return 'text-red-500 bg-red-500/10 border-red-500/20';
  }
}

export default function LoadHistoryPage() {
  const [history, setHistory] = useState<LoadAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLoadHistory().then((data) => {
      setHistory(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">Load Test History</h1>
            <p className="text-sm text-muted-foreground">
              Review past concurrency simulations, throughput limits, and latency percentiles.
            </p>
          </div>
          <Link
            href="/load"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #E11D48 100%)' }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Load Test
          </Link>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-muted-foreground mb-3">dataset_linked</span>
            <h3 className="text-lg font-bold text-foreground mb-1">No Load Tests Found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Execute your first load test to simulate virtual users and measure latency percentiles.
            </p>
            <Link
              href="/load"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg shadow-purple-500/20"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #E11D48 100%)' }}
            >
              Start Load Test
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((audit) => (
              <motion.div
                key={audit.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-card border border-border/80 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn('w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-black shrink-0', getGradeColor(audit.grade))}>
                    <span className="text-lg leading-none">{audit.grade}</span>
                    <span className="text-[9px] font-bold opacity-80">{audit.score}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{audit.url}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}</span>
                      <span>•</span>
                      <span>{audit.config.virtualUsers} VUs</span>
                      <span>•</span>
                      <span>{audit.summary.p95Ms}ms p95</span>
                      <span>•</span>
                      <span>{audit.summary.throughputRps} RPS</span>
                    </p>
                  </div>
                </div>

                <Link
                  href="/load"
                  className="px-3 py-1.5 rounded-lg border border-border/80 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  View Details
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
