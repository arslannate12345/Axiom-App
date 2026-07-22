'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getSecurityHistory } from '@/lib/security-service';
import type { SecurityAudit } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function SecurityReportsPage() {
  const [reports, setReports] = useState<SecurityAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSecurityHistory().then((data) => {
      setReports(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">Security Audit Reports</h1>
            <p className="text-sm text-muted-foreground">
              Generated web security assessment reports and remediation guides.
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
            <p className="font-semibold text-foreground">No security reports available</p>
            <p className="text-sm text-muted-foreground mt-1">Run a security scan to generate your first audit report.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-border rounded-xl bg-card p-5 space-y-4 hover:border-red-500/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 pr-3">
                    <p className="text-sm font-bold text-foreground font-mono truncate">{report.url}</p>
                    <p className="text-xs text-muted-foreground">
                      Scanned {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded font-black text-sm border bg-red-500/10 border-red-500/20 text-red-500">
                    Grade {report.grade}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Score</p>
                    <p className="text-sm font-black text-foreground">{report.score}/100</p>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Issues</p>
                    <p className="text-sm font-black text-red-500">
                      {report.summary.criticalCount + report.summary.highCount + report.summary.mediumCount}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Passed</p>
                    <p className="text-sm font-black text-emerald-500">{report.summary.passedCount}</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/security-web/reports/${report.id}`}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <span>View Full Report</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
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
