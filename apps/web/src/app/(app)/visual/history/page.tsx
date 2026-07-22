'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getVisualHistory } from '@/lib/visual-service';
import type { VisualCaptureSession } from '@axiom/core/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function VisualHistoryPage() {
  const [history, setHistory] = useState<VisualCaptureSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getVisualHistory().then((data) => {
      setHistory(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">Visual Capture History</h1>
            <p className="text-sm text-muted-foreground">
              Review and inspect past responsive snapshot sessions and layout diffs.
            </p>
          </div>
          <Link
            href="/visual"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Capture
          </Link>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-12 border rounded-xl bg-card">
            <span className="material-symbols-outlined text-4xl mb-4 text-muted-foreground">devices</span>
            <p className="font-semibold text-foreground">No visual capture sessions found</p>
            <p className="text-sm text-muted-foreground mt-1">Run your first responsive snapshot capture to see it here.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Target URL</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-40 text-center">Match Score</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-40 text-center">Viewports</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-40">Date</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((session, index) => (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium truncate max-w-[240px]">
                      <span className="font-mono text-xs">{session.url}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {session.overallMatchScore}% Match
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {session.viewports.map((vp) => (
                          <span key={vp.id} title={vp.label} className="material-symbols-outlined text-muted-foreground text-[16px]">
                            {vp.icon}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/visual/reports/${session.id}`}
                        className="text-xs font-bold text-purple-500 hover:underline"
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
