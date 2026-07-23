'use client';

import { useState } from 'react';
import type { HciDiagnosticResult, HciCategory, HciSeverity } from '@axiom/core/types';
import { cn } from '@/lib/utils';

interface HciEvaluationResultsProps {
  diagnostic: HciDiagnosticResult;
}

export function HciEvaluationResults({ diagnostic }: HciEvaluationResultsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { hciScore, grade, findings, cardMetrics } = diagnostic;

  const filteredFindings = findings.filter((f) => {
    if (activeCategory === 'all') return true;
    return f.category === activeCategory;
  });

  const getSeverityBadge = (severity: HciSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
      case 'info':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
  };

  const getCategoryIcon = (category: HciCategory) => {
    switch (category) {
      case 'latency_delay':
        return 'speed';
      case 'visual_hierarchy':
        return 'view_quilt';
      case 'feedback_status':
        return 'notifications_active';
      case 'touch_target':
        return 'ads_click';
      case 'cognitive_load':
        return 'psychology';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* HCI Usability Score */}
        <div className="md:col-span-2 bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              HCI Usability Index
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">{hciScore}</span>
              <span className="text-sm font-bold text-muted-foreground">/ 100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Human-Computer Interaction Heuristic Score
            </p>
          </div>

          <div className="w-18 h-18 px-5 py-3 rounded-2xl border flex flex-col items-center justify-center font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-sm">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">
              Grade
            </span>
            <span className="text-2xl">{grade}</span>
          </div>
        </div>

        {/* Card Latency Metric */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Card Latency & Delays
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span
              className={cn(
                'text-2xl font-black',
                cardMetrics.hasExcessiveDelays ? 'text-red-500' : 'text-emerald-500'
              )}
            >
              {cardMetrics.avgTransitionDelayMs}ms
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">
            {cardMetrics.hasExcessiveDelays ? '⚠️ Delays > 300ms (Bad UX)' : '✓ Fast card transitions'}
          </span>
        </div>

        {/* Touch Target Issues */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Touch Target Issues
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span
              className={cn(
                'text-2xl font-black',
                cardMetrics.touchTargetIssuesCount > 0 ? 'text-amber-500' : 'text-emerald-500'
              )}
            >
              {cardMetrics.touchTargetIssuesCount}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">elements</span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">Fitts's Law (under 44px)</span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
            activeCategory === 'all'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted'
          )}
        >
          <span>All HCI Findings</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/40">
            {findings.length}
          </span>
        </button>

        {(
          [
            'latency_delay',
            'touch_target',
            'feedback_status',
            'cognitive_load',
            'visual_hierarchy',
          ] as HciCategory[]
        ).map((cat) => {
          const count = findings.filter((f) => f.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 capitalize',
                activeCategory === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted'
              )}
            >
              <span className="material-symbols-outlined text-[14px]">{getCategoryIcon(cat)}</span>
              <span>{cat.replace('_', ' ')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/40">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.map((finding) => (
          <div
            key={finding.id}
            className="p-4 rounded-xl border border-border/80 bg-white dark:bg-card shadow-sm space-y-3 hover:border-purple-500/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border',
                      getSeverityBadge(finding.severity)
                    )}
                  >
                    {finding.severity}
                  </span>
                  <span className="text-xs font-bold text-foreground">{finding.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{finding.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
              <div className="bg-muted/30 p-2.5 rounded-lg">
                <span className="font-bold text-foreground block mb-0.5">HCI UX Impact:</span>
                <span className="text-muted-foreground">{finding.impact}</span>
              </div>
              <div className="bg-purple-500/5 border border-purple-500/10 p-2.5 rounded-lg">
                <span className="font-bold text-purple-600 dark:text-purple-400 block mb-0.5">
                  Recommendation:
                </span>
                <span className="text-purple-700 dark:text-purple-300">
                  {finding.recommendation}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
