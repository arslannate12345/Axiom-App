import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface OpportunitiesListProps {
  lighthouseResult: any;
}

export function OpportunitiesList({ lighthouseResult }: OpportunitiesListProps) {
  const audits = lighthouseResult?.audits || {};
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Extract actionable items
  const issues = Object.values(audits).filter((audit: any) => {
    // We only care about opportunities or diagnostics that actually have an impact (score < 1 or numericValue/wastedMs > 0)
    if (audit.score === 1) return false;
    if (audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'informative') return false;
    if (audit.details?.type === 'opportunity') return true;
    if (audit.score !== null && audit.score < 1) return true;
    return false;
  }).sort((a: any, b: any) => {
    // Sort by wasted ms (savings) or impact
    const savingsA = a.details?.overallSavingsMs || 0;
    const savingsB = b.details?.overallSavingsMs || 0;
    if (savingsA !== savingsB) return savingsB - savingsA;
    return (a.score || 0) - (b.score || 0);
  });

  if (issues.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">
        <span className="material-symbols-outlined text-4xl mb-2 text-emerald-500">verified</span>
        <p className="font-semibold text-foreground">No major issues found</p>
        <p className="text-sm">Great job! Lighthouse didn't find any significant performance bottlenecks.</p>
      </div>
    );
  }

  const getSeverityColor = (score: number | null) => {
    if (score === null) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (score >= 0.9) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 0.5) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="space-y-3">
      {issues.map((audit: any, index: number) => {
        const isExpanded = expandedId === audit.id;
        const severityClass = getSeverityColor(audit.score);
        const savings = audit.details?.overallSavingsMs 
          ? `${(audit.details.overallSavingsMs / 1000).toFixed(2)}s` 
          : audit.displayValue;

        return (
          <motion.div
            key={audit.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border border-border/80 rounded-xl bg-white dark:bg-card shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : audit.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0 border", severityClass)}>
                  <span className="material-symbols-outlined text-[20px]">
                    {audit.score !== null && audit.score < 0.5 ? 'error' : 'warning'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{audit.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                      {audit.details?.type === 'opportunity' ? 'Opportunity' : 'Diagnostic'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {savings && (
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{savings}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Savings</p>
                  </div>
                )}
                <span className={cn(
                  "material-symbols-outlined text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}>
                  expand_more
                </span>
              </div>
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-border/50 bg-muted/20 text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: audit.description.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>') }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
