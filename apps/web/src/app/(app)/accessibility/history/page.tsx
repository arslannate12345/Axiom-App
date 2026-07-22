'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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

export default function AccessibilityHistoryPage() {
  const [history, setHistory] = useState<PerformanceAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuditHistory()
      .then((data) => {
        setHistory(data);
      })
      .catch((err) => {
        console.warn('Failed to load accessibility history', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
      <div className="max-w-5xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-foreground mb-2">Accessibility History</h1>
          <p className="text-sm text-muted-foreground">
            Track your WCAG compliance grades over time.
          </p>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-12 border rounded-xl bg-card">
            <span className="material-symbols-outlined text-4xl mb-4 text-muted-foreground">history</span>
            <p className="font-semibold">No history found</p>
            <p className="text-sm text-muted-foreground">Run your first accessibility scan to see it here.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">URL</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-32">Grade</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-24 text-center">Score</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-24">Strategy</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-40">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((audit, index) => (
                  <motion.tr 
                    key={audit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium truncate max-w-[200px]">{audit.url}</td>
                    <td className="px-6 py-4">
                      <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded font-black border", getGradeColor(audit.accessibility_score))}>
                        {getGradeLetter(audit.accessibility_score)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-center">
                      {audit.accessibility_score ?? '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-[11px] font-semibold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">
                          {audit.strategy === 'mobile' ? 'smartphone' : 'computer'}
                        </span>
                        {audit.strategy}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
