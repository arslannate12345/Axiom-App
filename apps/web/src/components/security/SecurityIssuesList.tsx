'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { SecurityFinding, SecuritySeverity } from '@axiom/core/types';
import { cn } from '@/lib/utils';

interface SecurityIssuesListProps {
  findings: SecurityFinding[];
}

export function SecurityIssuesList({ findings }: SecurityIssuesListProps) {
  const [filter, setFilter] = useState<'all' | 'fail' | 'warn' | 'pass'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | SecuritySeverity>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFindings = findings.filter((f) => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  const handleCopyCode = (id: string, code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (severity: SecuritySeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: SecurityFinding['status']) => {
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'fail', 'warn', 'pass'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
                filter === st
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {st === 'all' ? 'All Findings' : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Severity:</span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors',
                severityFilter === sev
                  ? 'bg-muted text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="text-center p-8 border border-border rounded-xl bg-card">
          <span className="material-symbols-outlined text-3xl text-muted-foreground mb-2">shield_moon</span>
          <p className="text-sm font-semibold text-foreground">No matching security findings</p>
          <p className="text-xs text-muted-foreground">Adjust filters to see other checks.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredFindings.map((finding) => {
            const isExpanded = expandedId === finding.id;

            return (
              <div
                key={finding.id}
                className={cn(
                  'border rounded-xl bg-card transition-all duration-200 overflow-hidden',
                  finding.status === 'fail' ? 'border-red-500/30' : finding.status === 'warn' ? 'border-amber-500/30' : 'border-border'
                )}
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusIcon(finding.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{finding.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{finding.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase border', getSeverityBadge(finding.severity))}>
                      {finding.severity}
                    </span>
                    <span className="material-symbols-outlined text-muted-foreground text-[18px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/60 bg-muted/20 p-4 space-y-3"
                    >
                      {/* Impact */}
                      <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Security Impact</h4>
                        <p className="text-xs text-foreground leading-relaxed">{finding.impact}</p>
                      </div>

                      {/* Remediation */}
                      {finding.remediation && (
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <h4 className="text-xs font-bold uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">build</span>
                            Remediation Guidance
                          </h4>
                          <p className="text-xs text-muted-foreground">{finding.remediation.summary}</p>

                          {finding.remediation.codeSnippet && (
                            <div className="relative mt-2 rounded-lg bg-zinc-950 p-3 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                              <button
                                onClick={() => handleCopyCode(finding.id, finding.remediation?.codeSnippet)}
                                className="absolute top-2 right-2 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] rounded flex items-center gap-1 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {copiedId === finding.id ? 'check' : 'content_copy'}
                                </span>
                                {copiedId === finding.id ? 'Copied' : 'Copy'}
                              </button>
                              <pre className="pr-12">{finding.remediation.codeSnippet}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
