'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getCodeAnalysisHistory } from '@/lib/code-analysis-service';
import type { CodeAnalysisAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function CodeAnalysisReportsPage() {
  const [reports, setReports] = useState<CodeAnalysisAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCodeAnalysisHistory().then((data) => {
      setReports(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">Code Quality Reports</h1>
            <p className="text-sm text-muted-foreground">
              Detailed breakdown of AST findings, critical security smells, and code maintainability grades.
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">
              autorenew
            </span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center p-12 border border-border/80 rounded-2xl bg-white dark:bg-card shadow-sm">
            <span className="material-symbols-outlined text-4xl mb-3 text-muted-foreground">description</span>
            <p className="font-semibold text-foreground">No Code Quality Reports Available</p>
            <p className="text-sm text-muted-foreground mt-1">Run static code analysis to generate your first audit report.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-border/80 rounded-2xl bg-white dark:bg-card p-5 space-y-4 shadow-sm hover:border-slate-500/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 pr-3">
                    <p className="text-sm font-bold text-foreground font-mono truncate">
                      {report.filename || 'Source Snippet'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analyzed {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg font-black text-sm border bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300">
                    Grade {report.grade}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Critical / High
                    </span>
                    <span className="text-sm font-black text-red-500">
                      {report.summary.criticalCount + report.summary.highCount}
                    </span>
                  </div>
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Lines of Code
                    </span>
                    <span className="text-sm font-black text-foreground">
                      {report.summary.linesOfCode} LOC
                    </span>
                  </div>
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Passed Rules
                    </span>
                    <span className="text-sm font-black text-emerald-500">
                      {report.summary.passedRulesCount}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/code-analysis/reports/${report.id}`}
                  className="w-full h-9 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  Inspect Report Analytics
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
