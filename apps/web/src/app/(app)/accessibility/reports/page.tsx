'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { getAuditHistory } from '@/lib/performance-service';
import type { PerformanceAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function getGradeLetter(score: number | null) {
  if (score === null) return '?';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getGradeColor(score: number | null) {
  if (score === null) return 'text-muted-foreground bg-muted border-border';
  if (score >= 90) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (score >= 80) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (score >= 70) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  if (score >= 60) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  return 'text-red-500 bg-red-500/10 border-red-500/20';
}

export default function AccessibilityReportsPage() {
  const [reports, setReports] = useState<PerformanceAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuditHistory().then((data) => {
      setReports(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
      <div className="max-w-5xl mx-auto w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-2">Accessibility Reports</h1>
            <p className="text-sm text-muted-foreground">
              View detailed WCAG and ARIA compliance reports for your past scans.
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center p-12 border rounded-xl bg-card">
            <span className="material-symbols-outlined text-4xl mb-4 text-muted-foreground">description</span>
            <p className="font-semibold">No reports generated</p>
            <p className="text-sm text-muted-foreground">Run an accessibility scan to generate a report.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {reports.map((audit, index) => (
              <Link key={audit.id} href={`/accessibility/reports/${audit.id}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-border rounded-xl bg-card p-4 hover:shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-bold text-foreground truncate">{audit.url}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className={cn("shrink-0 flex items-center justify-center w-10 h-10 rounded-lg font-black border text-lg", getGradeColor(audit.accessibility_score))}>
                      {getGradeLetter(audit.accessibility_score)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Strategy</p>
                      <p className="text-sm font-semibold capitalize">{audit.strategy}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Score</p>
                      <p className="text-sm font-semibold">{audit.accessibility_score ?? '-'}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
