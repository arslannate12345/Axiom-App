'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getSecurityHistory } from '@/lib/security-service';
import type { SecurityAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'B':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'C':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'D':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    default:
      return 'text-red-500 bg-red-500/10 border-red-500/20';
  }
}

export default function SecurityHistoryPage() {
  const [history, setHistory] = useState<SecurityAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSecurityHistory().then((data) => {
      setHistory(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">Security Scan History</h1>
            <p className="text-sm text-muted-foreground">
              Review and compare past security assessments and vulnerability scans.
            </p>
          </div>
          <Link
            href="/security-web"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Scan
          </Link>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-12 border rounded-xl bg-card">
            <span className="material-symbols-outlined text-4xl mb-4 text-muted-foreground">shield_locked</span>
            <p className="font-semibold text-foreground">No security scans found</p>
            <p className="text-sm text-muted-foreground mt-1">Run your first web security scan to start tracking history.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Target URL</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-28 text-center">Grade</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-28 text-center">Score</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-40">Findings</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-40">Date</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((audit, index) => (
                  <motion.tr
                    key={audit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium truncate max-w-[240px]">
                      <span className="font-mono text-xs">{audit.url}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded font-black border text-xs', getGradeColor(audit.grade))}>
                        {audit.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      {audit.score} / 100
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {audit.summary.criticalCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                            {audit.summary.criticalCount} Crit
                          </span>
                        )}
                        {audit.summary.highCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            {audit.summary.highCount} High
                          </span>
                        )}
                        {audit.summary.criticalCount === 0 && audit.summary.highCount === 0 && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Passed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/security-web/reports/${audit.id}`}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        View Report
                      </Link>
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
