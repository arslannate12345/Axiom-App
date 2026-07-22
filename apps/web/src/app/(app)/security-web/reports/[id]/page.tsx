'use client';

import { use, useEffect, useState } from 'react';
import { getSecurityAuditById } from '@/lib/security-service';
import type { SecurityAudit } from '@axiom/core/types';
import { SecurityIssuesList } from '@/components/security/SecurityIssuesList';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SecurityReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [audit, setAudit] = useState<SecurityAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSecurityAuditById(resolvedParams.id).then((res) => {
      setAudit(res);
      setIsLoading(false);
    });
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <span className="material-symbols-outlined text-4xl text-muted-foreground">gpp_bad</span>
        <h2 className="text-xl font-bold">Security Report Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested report ID could not be retrieved.</p>
        <Link href="/security-web/reports" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold">
          Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/security-web/reports" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Reports
          </Link>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:bg-muted flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print / Export PDF
          </button>
        </div>

        {/* Audit Header Banner */}
        <div className="border border-border rounded-xl bg-card p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">shield</span>
              <h1 className="text-xl font-black text-foreground font-mono">{audit.url}</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Generated {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-muted-foreground">Overall Score</p>
              <p className="text-2xl font-black text-foreground">{audit.score} / 100</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center font-black text-2xl">
              {audit.grade}
            </div>
          </div>
        </div>

        {/* Security Headers Breakdown */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground">HTTP Security Headers Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {audit.header_analysis.map((hdr) => (
              <div key={hdr.header} className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{hdr.header}</span>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', hdr.present ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                    {hdr.present ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {hdr.present ? hdr.value || 'Configured' : 'Missing'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Findings & Remediation */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-foreground">Audit Findings & Action Plan</h3>
          <SecurityIssuesList findings={audit.findings} />
        </div>
      </div>
    </div>
  );
}
