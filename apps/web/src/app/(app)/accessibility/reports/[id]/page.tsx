'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuditById } from '@/lib/performance-service';
import type { PerformanceAudit } from '@axiom/core/types';
import { AccessibilityIssuesList } from '@/components/accessibility/AccessibilityIssuesList';
import { Scorecard } from '@/components/performance/Scorecard';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

function getGrade(score: number | null) {
  if (score === null) return { letter: '?', color: 'text-muted-foreground bg-muted border-border' };
  if (score >= 90) return { letter: 'A', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  if (score >= 80) return { letter: 'B', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
  if (score >= 70) return { letter: 'C', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
  if (score >= 60) return { letter: 'D', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  return { letter: 'F', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
}

export default function AccessibilityReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [audit, setAudit] = useState<PerformanceAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      getAuditById(params.id).then((data) => {
        setAudit(data);
        setIsLoading(false);
      });
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl animate-spin text-muted-foreground">autorenew</span>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <span className="material-symbols-outlined text-4xl mb-4 text-red-500">error</span>
        <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
        <p className="text-muted-foreground mb-6">The requested accessibility report could not be found.</p>
        <Button onClick={() => router.push('/accessibility/reports')}>Back to Reports</Button>
      </div>
    );
  }

  const grade = getGrade(audit.accessibility_score);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="shrink-0 p-6 border-b border-border bg-card/50 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1 truncate max-w-[400px]">
                {audit.url}
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 uppercase font-semibold">
                  <span className="material-symbols-outlined text-[14px]">
                    {audit.strategy === 'mobile' ? 'smartphone' : 'computer'}
                  </span>
                  {audit.strategy}
                </span>
                <span>•</span>
                <span>{format(new Date(audit.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <span className="material-symbols-outlined text-[18px]">share</span>
            Share Report
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-5 gap-4">
            <div className={cn("col-span-1 rounded-2xl flex flex-col items-center justify-center p-6 border shadow-sm", grade.color)}>
              <span className="text-6xl font-black">{grade.letter}</span>
              <span className="text-[11px] uppercase font-bold tracking-widest mt-2 opacity-80">Grade</span>
            </div>
            <div className="col-span-4 grid grid-cols-4 gap-4">
              <Scorecard label="Accessibility" score={audit.accessibility_score} delay={0.1} />
              <Scorecard label="Performance" score={audit.performance_score} delay={0.2} />
              <Scorecard label="Best Practices" score={audit.best_practices_score} delay={0.3} />
              <Scorecard label="SEO" score={audit.seo_score} delay={0.4} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              WCAG & ARIA Violations
            </h2>
            <AccessibilityIssuesList lighthouseResult={audit.lighthouse_result} />
          </motion.div>

        </div>
      </div>
    </div>
  );
}
