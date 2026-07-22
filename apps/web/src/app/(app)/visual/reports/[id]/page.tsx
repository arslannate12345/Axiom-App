'use client';

import { use, useEffect, useState } from 'react';
import { getVisualSessionById } from '@/lib/visual-service';
import type { VisualCaptureSession } from '@axiom/core/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function VisualReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [session, setSession] = useState<VisualCaptureSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getVisualSessionById(resolvedParams.id).then((res) => {
      setSession(res);
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

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <span className="material-symbols-outlined text-4xl text-muted-foreground">tab_unselected</span>
        <h2 className="text-xl font-bold">Visual Report Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested visual report ID could not be retrieved.</p>
        <Link href="/visual/reports" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold">
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
          <Link href="/visual/reports" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Visual Reports
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
              <span className="material-symbols-outlined text-purple-500">devices</span>
              <h1 className="text-xl font-black text-foreground font-mono">{session.url}</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Captured {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-muted-foreground">Match Score</p>
              <p className="text-2xl font-black text-emerald-500">{session.overallMatchScore}%</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-500 font-bold text-xs uppercase">
              {session.status}
            </div>
          </div>
        </div>

        {/* Viewport Breakdown */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Responsive Viewports Breakdown</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {session.viewports.map((vp) => {
              const diff = session.diff_results.find((d) => d.viewportId === vp.id);
              return (
                <div key={vp.id} className="border border-border rounded-xl p-4 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500">{vp.icon}</span>
                    <span className="text-xs font-bold text-foreground">{vp.label}</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{vp.width} × {vp.height}px</p>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Match Score:</span>
                    <span className="text-xs font-bold text-emerald-500">{diff?.matchScore || 100}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
