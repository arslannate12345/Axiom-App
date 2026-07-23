'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getCodeAnalysisHistory } from '@/lib/code-analysis-service';
import type { CodeAnalysisAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function CodeAnalysisHistoryPage() {
  const [history, setHistory] = useState<CodeAnalysisAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCodeAnalysisHistory().then((data) => {
      setHistory(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">Code Analysis History</h1>
            <p className="text-sm text-muted-foreground">
              Review past white-box code scans, detected vulnerabilities, and maintainability metrics.
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">
              autorenew
            </span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-12 border border-border/80 rounded-2xl bg-white dark:bg-card shadow-sm">
            <span className="material-symbols-outlined text-4xl mb-3 text-muted-foreground">history</span>
            <p className="font-semibold text-foreground">No Code Audits Found</p>
            <p className="text-sm text-muted-foreground mt-1">Run static code analysis to start recording history.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl border border-border/80 bg-white dark:bg-card flex items-center justify-between shadow-sm hover:border-slate-500/40 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-500/10 border border-slate-500/20 flex flex-col items-center justify-center font-black text-slate-600 dark:text-slate-300">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Grade</span>
                    <span className="text-base">{item.grade}</span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground font-mono truncate">
                        {item.filename || 'Untitled Snippet'}
                      </p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted uppercase text-muted-foreground">
                        {item.language}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Analyzed {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })} •{' '}
                      {item.summary.linesOfCode} LOC • {item.findings.length} issues discovered
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-sm font-black text-foreground">{item.score} / 100</span>
                    <span className="text-[11px] text-muted-foreground block">Health Score</span>
                  </div>
                  <Link
                    href="/code-analysis"
                    className="h-8 px-3 rounded-lg border border-border/80 text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    <span>View Engine</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
