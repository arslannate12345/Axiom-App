'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { runAudit, getRecentAudits } from '@/lib/performance-service'; // Same backend service
import { Scorecard } from '@/components/performance/Scorecard';
import { AccessibilityIssuesList } from './AccessibilityIssuesList';
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

export function AccessibilityAuditEngine() {
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
  } = useAccessibilityStore();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We fetch recent audits using the same shared service table
    getRecentAudits().then(setRecentAudits);
  }, []);

  const handleRunScan = async (e: React.FormEvent) => {
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
      setError(err.message || 'An error occurred during the scan');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="shrink-0 p-6 border-b border-border bg-card/50">
        <div className="max-w-5xl mx-auto flex items-end gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground mb-2">Accessibility Scan</h1>
            <p className="text-sm text-muted-foreground">
              Automated WCAG 2.1 compliance and a11y checks
            </p>
          </div>
          
          <form onSubmit={handleRunScan} className="flex-1 max-w-xl flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground text-[18px]">
                language
              </span>
              <Input 
                value={currentUrl}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to scan (e.g. example.com)"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              {isAuditing ? (
                <>
                  <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">refresh</span>
                  Scanning...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2 text-[18px]">search</span>
                  Run Scan
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
              <span className="material-symbols-outlined text-4xl animate-spin mb-4 text-emerald-500">
                autorenew
              </span>
              <p className="font-semibold text-foreground">Running Accessibility Scan</p>
              <p className="text-xs mt-2">Checking ARIA labels, contrast, and WCAG rules...</p>
            </div>
          )}

          {!isAuditing && !activeAudit && !error && (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-card/20">
              <span className="material-symbols-outlined text-4xl mb-4 text-muted-foreground/50">
                accessibility_new
              </span>
              <p className="font-semibold text-foreground">Ready to Scan</p>
              <p className="text-xs mt-2 max-w-sm text-center">
                Enter a URL above and click Run Scan to generate a complete accessibility report.
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
                    Accessibility Grade & Scores
                  </h2>
                  <div className="grid grid-cols-5 gap-4">
                    {(() => {
                      const grade = getGrade(activeAudit.accessibility_score);
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
                      {/* Note: We put Accessibility first for this domain */}
                      <Scorecard label="Accessibility" score={activeAudit.accessibility_score} delay={0.1} />
                      <Scorecard label="Performance" score={activeAudit.performance_score} delay={0.2} />
                      <Scorecard label="Best Practices" score={activeAudit.best_practices_score} delay={0.3} />
                      <Scorecard label="SEO" score={activeAudit.seo_score} delay={0.4} />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    WCAG & ARIA Violations
                  </h2>
                  <AccessibilityIssuesList lighthouseResult={activeAudit.lighthouse_result} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
