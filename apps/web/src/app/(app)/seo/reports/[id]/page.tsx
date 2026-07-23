'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSeoAuditById } from '@/lib/seo-service';
import type { SeoAudit } from '@axiom/core/types';
import { SeoResults } from '@/components/seo/SeoResults';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function SeoReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [audit, setAudit] = useState<SeoAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      getSeoAuditById(params.id).then((data) => {
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
        <p className="text-muted-foreground mb-6">The requested SEO audit report could not be found.</p>
        <Link
          href="/seo/reports"
          className="h-10 px-4 rounded-xl bg-cyan-600 text-white font-bold text-sm flex items-center gap-2"
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
                <span className="material-symbols-outlined text-cyan-500 text-lg">travel_explore</span>
                <h1 className="text-xl font-bold text-foreground font-mono truncate max-w-[400px]">
                  {audit.url}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>SEO & Meta Tags Audit</span>
                <span>•</span>
                <span>{format(new Date(audit.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl font-black text-sm border bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
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
                  Overall SEO Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{audit.score}</span>
                  <span className="text-sm font-bold text-muted-foreground">/ 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate max-w-xs">{audit.url}</p>
              </div>

              <div className="w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-black text-cyan-600 dark:text-cyan-400 bg-white dark:bg-cyan-950/40 border-cyan-500/40 shadow-sm">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">Grade</span>
                <span className="text-3xl">{audit.grade}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Meta Checks</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                  {audit.meta_checks.filter((m) => m.status === 'pass').length}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">/ {audit.meta_checks.length}</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Tags verified</span>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Passed Checks</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-emerald-500">
                  {audit.summary.passedCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">/ {audit.findings.length}</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Assertions passed</span>
            </div>
          </motion.div>

          {/* Meta Tags Inspector */}
          {audit.meta_checks && audit.meta_checks.length > 0 && (
            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-500 text-lg">code</span>
                Meta Tag Diagnostics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {audit.meta_checks.map((mc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={cn('w-2 h-2 rounded-full', mc.present ? 'bg-emerald-500' : 'bg-red-500')} />
                      <span className="font-mono font-bold text-foreground">{mc.tag}</span>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded font-mono text-[10px] truncate max-w-[200px]', mc.present ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500')}>
                      {mc.value || 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-500">checklist</span>
              SEO Audit Findings & Recommendations
            </h3>
            <SeoResults findings={audit.findings} />
          </div>
        </div>
      </div>
    </div>
  );
}
