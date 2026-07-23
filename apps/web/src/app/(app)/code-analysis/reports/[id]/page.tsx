'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCodeAnalysisById } from '@/lib/code-analysis-service';
import type { CodeAnalysisAudit } from '@axiom/core/types';
import { CodeAnalysisResults } from '@/components/code-analysis/CodeAnalysisResults';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function CodeAnalysisReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [audit, setAudit] = useState<CodeAnalysisAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      getCodeAnalysisById(params.id).then((data) => {
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
        <p className="text-muted-foreground mb-6">The requested code analysis report could not be found.</p>
        <Link
          href="/code-analysis/reports"
          className="h-10 px-4 rounded-xl bg-slate-700 text-white font-bold text-sm flex items-center gap-2"
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
                <span className="material-symbols-outlined text-slate-500 text-lg">code_blocks</span>
                <h1 className="text-xl font-bold text-foreground font-mono truncate max-w-[400px]">
                  {audit.github_url || audit.filename || 'Source Code Audit'}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>Static Code Analysis</span>
                <span>•</span>
                <span>{format(new Date(audit.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl font-black text-sm border bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300">
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
                  Code Health Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{audit.score}</span>
                  <span className="text-sm font-bold text-muted-foreground">/ 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono truncate max-w-xs">
                  {audit.github_url || audit.filename} ({audit.summary.linesOfCode} LOC)
                </p>
              </div>

              <div className="w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-500/40 shadow-sm">
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">Grade</span>
                <span className="text-3xl">{audit.grade}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Critical & High</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-red-500">
                  {audit.summary.criticalCount + audit.summary.highCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">issues</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Requires immediate fix</span>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Files Analyzed</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
                  {audit.summary.filesAnalyzedCount || 1}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">files</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">
                {audit.summary.linesOfCode} total lines
              </span>
            </div>
          </motion.div>

          {/* GitHub File Summaries Breakdown */}
          {audit.file_summaries && audit.file_summaries.length > 1 && (
            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 text-lg">folder_open</span>
                Analyzed Repository Files ({audit.file_summaries.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {audit.file_summaries.map((f, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="font-mono font-bold text-foreground truncate">{f.filename}</p>
                      <span className="text-[10px] text-muted-foreground">{f.linesOfCode} LOC</span>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold shrink-0',
                        f.findingsCount > 0
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {f.findingsCount} issues
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Component */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">checklist</span>
              Static Analysis Findings ({audit.findings.length})
            </h3>
            <CodeAnalysisResults findings={audit.findings} />
          </div>
        </div>
      </div>
    </div>
  );
}
