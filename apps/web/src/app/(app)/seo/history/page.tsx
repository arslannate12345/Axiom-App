'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getSeoHistory } from '@/lib/seo-service';
import type { SeoAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'B':
      return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    case 'C':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'D':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    default:
      return 'text-red-500 bg-red-500/10 border-red-500/20';
  }
}

export default function SeoHistoryPage() {
  const [history, setHistory] = useState<SeoAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSeoHistory().then((data) => {
      setHistory(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">SEO Audit History</h1>
            <p className="text-sm text-muted-foreground">
              Review past SEO scores, meta tag inspections, and search engine optimization reports over time.
            </p>
          </div>
          <Link
            href="/seo"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New SEO Audit
          </Link>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-muted-foreground mb-3">travel_explore</span>
            <h3 className="text-lg font-bold text-foreground mb-1">No SEO Audits Found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Run your first SEO audit to inspect meta tags, Open Graph cards, and heading structure.
            </p>
            <Link
              href="/seo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
              style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}
            >
              Start SEO Audit
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((audit) => (
              <motion.div
                key={audit.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-card border border-border/80 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-cyan-500/30 transition-all"
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
                      <span>{audit.meta_checks.length} meta checks</span>
                      <span>•</span>
                      <span>{audit.summary.passedCount} assertions passed</span>
                    </p>
                  </div>
                </div>

                <Link
                  href="/seo"
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
