'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuditById } from '@/lib/performance-service';
import type { PerformanceAudit } from '@axiom/core/types';
import { OpportunitiesList } from '@/components/performance/OpportunitiesList';
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

export default function ReportDetailPage() {
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
        <p className="text-muted-foreground mb-6">The requested performance report could not be found.</p>
        <Button onClick={() => router.push('/performance/reports')}>Back to Reports</Button>
      </div>
    );
  }

  const grade = getGrade(audit.performance_score);

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
          
          {/* Top Level Summary (Grade & Scores) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-5 gap-4">
            <div className={cn("col-span-1 rounded-2xl flex flex-col items-center justify-center p-6 border shadow-sm", grade.color)}>
              <span className="text-6xl font-black">{grade.letter}</span>
              <span className="text-[11px] uppercase font-bold tracking-widest mt-2 opacity-80">Grade</span>
            </div>
            <div className="col-span-4 grid grid-cols-4 gap-4">
              <Scorecard label="Performance" score={audit.performance_score} delay={0.1} />
              <Scorecard label="Accessibility" score={audit.accessibility_score} delay={0.2} />
              <Scorecard label="Best Practices" score={audit.best_practices_score} delay={0.3} />
              <Scorecard label="SEO" score={audit.seo_score} delay={0.4} />
            </div>
          </motion.div>

          {/* Core Web Vitals */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Core Web Vitals
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Largest Contentful Paint" value={audit.core_web_vitals.lcp} unit="ms" thresholds={{ good: 2500, poor: 4000 }} />
              <MetricCard label="Cumulative Layout Shift" value={audit.core_web_vitals.cls} unit="" thresholds={{ good: 0.1, poor: 0.25 }} />
              <MetricCard label="First Contentful Paint" value={audit.core_web_vitals.fcp} unit="ms" thresholds={{ good: 1800, poor: 3000 }} />
              <MetricCard label="Time to First Byte" value={audit.core_web_vitals.ttfb} unit="ms" thresholds={{ good: 800, poor: 1800 }} />
              <MetricCard label="Interaction to Next Paint" value={audit.core_web_vitals.inp} unit="ms" thresholds={{ good: 200, poor: 500 }} />
            </div>
          </motion.div>

          {/* Opportunities / Recommendations */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">build</span>
              Top Issues & Recommendations
            </h2>
            <OpportunitiesList lighthouseResult={audit.lighthouse_result} />
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// Subcomponent duplicated here for simplicity since it's only used in these two places (or we could extract it to a shared file)
interface MetricCardProps {
  label: string;
  value?: number;
  unit: string;
  thresholds: { good: number; poor: number };
}

function MetricCard({ label, value, unit, thresholds }: MetricCardProps) {
  if (value === undefined) return null;

  const isGood = value <= thresholds.good;
  const isPoor = value >= thresholds.poor;
  
  let color = 'text-amber-500';
  let bg = 'bg-amber-500/10 border-amber-500/20';
  let icon = 'warning';

  if (isGood) {
    color = 'text-emerald-500';
    bg = 'bg-emerald-500/10 border-emerald-500/20';
    icon = 'check_circle';
  } else if (isPoor) {
    color = 'text-red-500';
    bg = 'bg-red-500/10 border-red-500/20';
    icon = 'error';
  }

  const displayValue = unit === '' ? value.toFixed(3) : Math.round(value);

  return (
    <div className={`p-4 rounded-xl border ${bg} flex items-start gap-4`}>
      <span className={`material-symbols-outlined mt-0.5 ${color}`}>
        {icon}
      </span>
      <div>
        <p className={`text-xl font-black ${color}`}>
          {displayValue} <span className="text-sm font-bold opacity-70">{unit}</span>
        </p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
          {label}
        </p>
      </div>
    </div>
  );
}
