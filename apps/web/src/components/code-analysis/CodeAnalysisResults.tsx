'use client';

import { useState } from 'react';
import type { CodeFinding, FindingSeverity, AnalysisRuleCategory } from '@axiom/core/types';
import { cn } from '@/lib/utils';

interface CodeAnalysisResultsProps {
  findings: CodeFinding[];
}

export function CodeAnalysisResults({ findings }: CodeAnalysisResultsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredFindings = findings.filter((f) => {
    if (activeCategory === 'all') return true;
    return f.category === activeCategory;
  });

  const getSeverityBadge = (severity: FindingSeverity) => {
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

  const getCategoryIcon = (category: AnalysisRuleCategory) => {
    switch (category) {
      case 'bug':
        return 'bug_report';
      case 'security':
        return 'shield';
      case 'quality':
        return 'analytics';
      case 'maintainability':
        return 'cleaning_services';
      case 'best_practice':
        return 'verified';
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
            activeCategory === 'all'
              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted'
          )}
        >
          <span>All Findings</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/40">
            {findings.length}
          </span>
        </button>

        {(['bug', 'security', 'quality', 'maintainability', 'best_practice'] as AnalysisRuleCategory[]).map(
          (cat) => {
            const count = findings.filter((f) => f.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 capitalize',
                  activeCategory === cat
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                )}
              >
                <span className="material-symbols-outlined text-[14px]">{getCategoryIcon(cat)}</span>
                <span>{cat.replace('_', ' ')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/40">{count}</span>
              </button>
            );
          }
        )}
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="text-center p-8 border border-border/80 rounded-2xl bg-white dark:bg-card">
          <span className="material-symbols-outlined text-3xl text-emerald-500 mb-2">check_circle</span>
          <p className="text-sm font-semibold text-foreground">No Issues Discovered</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No code issues found for this category filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="p-4 rounded-xl border border-border/80 bg-white dark:bg-card shadow-sm space-y-3 hover:border-slate-400/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
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
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-500/10 px-2 py-1 rounded-md border border-slate-500/20 block truncate max-w-[220px]">
                    {finding.filePath ? `${finding.filePath}:${finding.line}` : `Line ${finding.line}`}
                  </span>
                </div>
              </div>

              {finding.snippet && (
                <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800">
                  <span className="text-slate-500 select-none mr-3">{finding.line} |</span>
                  <span>{finding.snippet}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                <div className="bg-muted/30 p-2 rounded-lg">
                  <span className="font-bold text-foreground block mb-0.5">Impact:</span>
                  <span className="text-muted-foreground">{finding.impact}</span>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-lg">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                    Recommendation:
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {finding.recommendation}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
