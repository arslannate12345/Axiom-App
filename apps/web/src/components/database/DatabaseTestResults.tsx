'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { DatabaseTestFinding, DatabaseTestCategory, DatabaseTestSeverity } from '@axiom/core/types';
import { cn } from '@/lib/utils';

interface DatabaseTestResultsProps {
  findings: DatabaseTestFinding[];
}

export function DatabaseTestResults({ findings }: DatabaseTestResultsProps) {
  const [filter, setFilter] = useState<'all' | 'fail' | 'warn' | 'pass'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DatabaseTestCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFindings = findings.filter((f) => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: DatabaseTestSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: DatabaseTestFinding['status']) => {
    switch (status) {
      case 'pass':
        return <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>;
      case 'fail':
        return <span className="material-symbols-outlined text-red-500 text-[18px]">cancel</span>;
      case 'warn':
        return <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card border border-border/80 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {(['all', 'fail', 'warn', 'pass'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                  filter === st
                    ? 'bg-white dark:bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-white dark:bg-background border border-border/80 text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="all">All Categories</option>
            <option value="connection">Connection</option>
            <option value="performance">Performance</option>
            <option value="schema">Schema</option>
            <option value="crud">CRUD</option>
            <option value="integrity">Integrity</option>
            <option value="security">Security</option>
          </select>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-2.5">
        {filteredFindings.length === 0 ? (
          <div className="bg-white dark:bg-card border border-border/80 rounded-xl p-8 text-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">find_in_page</span>
            <p className="text-sm font-medium text-foreground">No database audit findings match the current filters.</p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedId === finding.id;
            return (
              <motion.div
                key={finding.id}
                layout
                className="bg-white dark:bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden transition-all hover:border-cyan-500/30"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusIcon(finding.status)}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {finding.title}
                        {finding.latencyMs !== undefined && (
                          <span className="text-xs font-normal text-muted-foreground font-mono">
                            ({finding.latencyMs}ms)
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate max-w-xl">{finding.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider', getSeverityBadge(finding.severity))}>
                      {finding.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                      {finding.category}
                    </span>
                    <span className="material-symbols-outlined text-muted-foreground text-[18px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/60 bg-muted/20 p-4 space-y-3"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-foreground mb-1">Impact Analysis</h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">{finding.impact}</p>
                      </div>

                      {finding.recommendation && (
                        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                          <h5 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px]">lightbulb</span>
                            Optimization & Remediation
                          </h5>
                          <p className="text-xs text-foreground/80 leading-relaxed">{finding.recommendation}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
