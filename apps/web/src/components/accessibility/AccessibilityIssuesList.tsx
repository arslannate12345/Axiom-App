import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface AccessibilityIssuesListProps {
  lighthouseResult: any;
}

export function AccessibilityIssuesList({ lighthouseResult }: AccessibilityIssuesListProps) {
  const audits = lighthouseResult?.audits || {};
  const categories = lighthouseResult?.categories || {};
  const a11yCategory = categories.accessibility;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!a11yCategory || !a11yCategory.auditRefs) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">
        <span className="material-symbols-outlined text-4xl mb-2 text-muted-foreground">help_outline</span>
        <p className="font-semibold text-foreground">No accessibility data available</p>
        <p className="text-sm">Run an audit to see accessibility violations.</p>
      </div>
    );
  }

  // Extract a11y audits
  const a11yAuditIds = a11yCategory.auditRefs.map((ref: any) => ref.id);
  
  const issues = Object.values(audits).filter((audit: any) => {
    // Must be an a11y audit
    if (!a11yAuditIds.includes(audit.id)) return false;
    // Skip passed audits and informative audits
    if (audit.score === 1) return false;
    if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'notApplicable') return false;
    return true;
  }).sort((a: any, b: any) => {
    // Sort by manual checks last, then by score
    if (a.scoreDisplayMode === 'manual' && b.scoreDisplayMode !== 'manual') return 1;
    if (a.scoreDisplayMode !== 'manual' && b.scoreDisplayMode === 'manual') return -1;
    return (a.score || 0) - (b.score || 0);
  });

  if (issues.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">
        <span className="material-symbols-outlined text-4xl mb-2 text-emerald-500">accessibility_new</span>
        <p className="font-semibold text-foreground">No accessibility violations found</p>
        <p className="text-sm">Great job! The automated checks didn't find any WCAG violations.</p>
      </div>
    );
  }

  const getSeverityStyles = (audit: any) => {
    if (audit.scoreDisplayMode === 'manual') {
      return {
        color: 'text-slate-500',
        bg: 'bg-slate-500/10 border-slate-500/20',
        icon: 'fact_check',
        label: 'Manual Check',
      };
    }
    
    // Lighthouse score for violations is usually 0, but sometimes a fraction
    if (audit.score === 0) {
      return {
        color: 'text-red-500',
        bg: 'bg-red-500/10 border-red-500/20',
        icon: 'error',
        label: 'Violation',
      };
    }

    return {
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: 'warning',
      label: 'Warning',
    };
  };

  return (
    <div className="space-y-3">
      {issues.map((audit: any, index: number) => {
        const isExpanded = expandedId === audit.id;
        const styles = getSeverityStyles(audit);

        return (
          <motion.div
            key={audit.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border border-border rounded-xl bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : audit.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0 border", styles.color, styles.bg)}>
                  <span className="material-symbols-outlined text-[20px]">
                    {styles.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{audit.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                      {styles.label}
                    </span>
                    {audit.details?.items?.length > 0 && (
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        • {audit.details.items.length} element(s) failing
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
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
                  <div className="p-4 pt-0 border-t border-border/50 bg-muted/20">
                    <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none mb-4">
                      <div dangerouslySetInnerHTML={{ __html: audit.description.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>') }} />
                    </div>
                    
                    {/* Render failing nodes if available */}
                    {audit.details?.items && audit.details.items.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Failing Elements</h4>
                        {audit.details.items.map((item: any, idx: number) => {
                          if (item.node?.snippet) {
                            return (
                              <div key={idx} className="bg-background border border-border p-3 rounded-md overflow-x-auto">
                                <code className="text-[11px] text-pink-500 whitespace-pre">{item.node.snippet}</code>
                                {item.node.explanation && (
                                  <p className="text-xs text-muted-foreground mt-2">{item.node.explanation}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
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
