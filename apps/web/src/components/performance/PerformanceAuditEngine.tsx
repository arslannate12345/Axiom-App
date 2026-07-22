'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePerformanceStore } from '@/stores/performanceStore';
import { runAudit, getRecentAudits } from '@/lib/performance-service';
import { Scorecard } from './Scorecard';
import { OpportunitiesList } from './OpportunitiesList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AuditStrategy } from '@axiom/core/types';

function getGrade(score: number | null) {
  if (score === null) return { letter: '?', color: 'text-muted-foreground bg-muted border-border' };
  if (score >= 90) return { letter: 'A', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  if (score >= 80) return { letter: 'B', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
  if (score >= 70) return { letter: 'C', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
  if (score >= 60) return { letter: 'D', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  return { letter: 'F', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
}

export function PerformanceAuditEngine() {
  const {
    currentUrl,
    strategy,
    isAuditing,
    activeAudit,
    setUrl,
    setStrategy,
    setIsAuditing,
    setActiveAudit,
    addRecentAudit,
    setRecentAudits
  } = usePerformanceStore();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecentAudits().then(setRecentAudits);
  }, []);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUrl) return;
    
    let targetUrl = currentUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      setUrl(targetUrl);
    }

    setIsAuditing(true);
    setError(null);
    setActiveAudit(null);

    try {
      const result = await runAudit(targetUrl, strategy);
      setActiveAudit(result);
      addRecentAudit(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred during the audit');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="shrink-0 p-6 border-b border-border bg-card/50">
        <div className="max-w-5xl mx-auto flex items-end gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground mb-2">Performance Audit</h1>
            <p className="text-sm text-muted-foreground">
              Powered by Lighthouse & Core Web Vitals
            </p>
          </div>
          
          <form onSubmit={handleRunAudit} className="flex-1 max-w-xl flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground text-[18px]">
                language
              </span>
              <Input 
                value={currentUrl}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to audit (e.g. example.com)"
                className="pl-9 bg-background"
                disabled={isAuditing}
                required
              />
            </div>
            
            <div className="flex bg-muted p-1 rounded-md">
              <button
                type="button"
                onClick={() => setStrategy('mobile')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  strategy === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={isAuditing}
              >
                <span className="material-symbols-outlined text-[14px]">smartphone</span>
                Mobile
              </button>
              <button
                type="button"
                onClick={() => setStrategy('desktop')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  strategy === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={isAuditing}
              >
                <span className="material-symbols-outlined text-[14px]">computer</span>
                Desktop
              </button>
            </div>

            <Button 
              type="submit" 
              disabled={isAuditing || !currentUrl}
              className="bg-amber-600 hover:bg-amber-700 text-white min-w-[120px]"
            >
              {isAuditing ? (
                <>
                  <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">refresh</span>
                  Auditing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2 text-[18px]">bolt</span>
                  Run Audit
                </>
              )}
            </Button>
          </form>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {isAuditing && !activeAudit && (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <span className="material-symbols-outlined text-4xl animate-spin mb-4 text-amber-500">
                autorenew
              </span>
              <p className="font-semibold text-foreground">Running Lighthouse Audit</p>
              <p className="text-xs mt-2">This usually takes 10-20 seconds...</p>
            </div>
          )}

          {!isAuditing && !activeAudit && !error && (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-card/20">
              <span className="material-symbols-outlined text-4xl mb-4 text-muted-foreground/50">
                speed
              </span>
              <p className="font-semibold text-foreground">Ready to Audit</p>
              <p className="text-xs mt-2 max-w-sm text-center">
                Enter a URL above and click Run Audit to generate a complete performance report.
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeAudit && !isAuditing && (
              <motion.div
                key={activeAudit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 pb-12"
              >
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    GTmetrix Grade & Scores
                  </h2>
                  <div className="grid grid-cols-5 gap-4">
                    {(() => {
                      const grade = getGrade(activeAudit.performance_score);
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4 }}
                          className={cn("col-span-1 rounded-2xl flex flex-col items-center justify-center p-6 border shadow-sm", grade.color)}
                        >
                          <span className="text-6xl font-black">{grade.letter}</span>
                          <span className="text-[11px] uppercase font-bold tracking-widest mt-2 opacity-80">Grade</span>
                        </motion.div>
                      );
                    })()}
                    <div className="col-span-4 grid grid-cols-4 gap-4">
                      <Scorecard label="Performance" score={activeAudit.performance_score} delay={0.1} />
                      <Scorecard label="Accessibility" score={activeAudit.accessibility_score} delay={0.2} />
                      <Scorecard label="Best Practices" score={activeAudit.best_practices_score} delay={0.3} />
                      <Scorecard label="SEO" score={activeAudit.seo_score} delay={0.4} />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Core Web Vitals
                  </h2>
                  <div className="grid grid-cols-3 gap-4">
                    <MetricCard 
                      label="Largest Contentful Paint"
                      value={activeAudit.core_web_vitals.lcp}
                      unit="ms"
                      thresholds={{ good: 2500, poor: 4000 }}
                    />
                    <MetricCard 
                      label="Cumulative Layout Shift"
                      value={activeAudit.core_web_vitals.cls}
                      unit=""
                      thresholds={{ good: 0.1, poor: 0.25 }}
                    />
                    <MetricCard 
                      label="First Contentful Paint"
                      value={activeAudit.core_web_vitals.fcp}
                      unit="ms"
                      thresholds={{ good: 1800, poor: 3000 }}
                    />
                    <MetricCard 
                      label="Time to First Byte"
                      value={activeAudit.core_web_vitals.ttfb}
                      unit="ms"
                      thresholds={{ good: 800, poor: 1800 }}
                    />
                    <MetricCard 
                      label="Interaction to Next Paint"
                      value={activeAudit.core_web_vitals.inp}
                      unit="ms"
                      thresholds={{ good: 200, poor: 500 }}
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    Top Issues & Recommendations
                  </h2>
                  <OpportunitiesList lighthouseResult={activeAudit.lighthouse_result} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

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
