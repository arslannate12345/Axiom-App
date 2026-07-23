'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useSeoStore } from '@/stores/seoStore';
import { SeoResults } from './SeoResults';
import { cn } from '@/lib/utils';

export function SeoAuditEngine() {
  const { targetUrl, setTargetUrl, isAuditing, activeAudit, error, startAudit } = useSeoStore();
  const [inputUrl, setInputUrl] = useState(targetUrl || 'https://example.com');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setTargetUrl(inputUrl);
    startAudit(inputUrl);
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-950/40 border-emerald-500/40 shadow-sm';
      case 'B':
        return 'text-cyan-600 dark:text-cyan-400 bg-white dark:bg-cyan-950/40 border-cyan-500/40 shadow-sm';
      case 'C':
        return 'text-amber-600 dark:text-amber-400 bg-white dark:bg-amber-950/40 border-amber-500/40 shadow-sm';
      case 'D':
        return 'text-orange-600 dark:text-orange-400 bg-white dark:bg-orange-950/40 border-orange-500/40 shadow-sm';
      default:
        return 'text-red-600 dark:text-red-400 bg-white dark:bg-red-950/40 border-red-500/40 shadow-sm';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-8">
      {/* Top Header & URL Input */}
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                travel_explore
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">SEO & Meta Tags Audit Engine</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Comprehensive search engine optimization: title/description length, Open Graph previews, headings structure, and canonical link checks.
          </p>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]">
              link
            </span>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://example.com or website URL..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900/60 backdrop-blur-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isAuditing}
            className="h-11 px-6 rounded-xl font-extrabold text-white shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}
          >
            {isAuditing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                <span>Auditing SEO...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">travel_explore</span>
                <span>Run SEO Audit</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}
      </div>

      {/* Main Audit Display */}
      {activeAudit && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto w-full space-y-6"
        >
          {/* Overview Score Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Grade & Score */}
            <div className="md:col-span-2 bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Overall SEO Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{activeAudit.score}</span>
                  <span className="text-sm font-bold text-muted-foreground">/ 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate max-w-xs">{activeAudit.url}</p>
              </div>

              <div className={cn('w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-black', getGradeColor(activeAudit.grade))}>
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">Grade</span>
                <span className="text-3xl">{activeAudit.grade}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Meta Checks</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                  {activeAudit.meta_checks.filter(m => m.status === 'pass').length}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">/ {activeAudit.meta_checks.length}</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Tags verified</span>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Passed Checks</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-emerald-500">
                  {activeAudit.summary.passedCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">/ {activeAudit.findings.length}</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Assertions passed</span>
            </div>
          </div>

          {/* Meta Tags Inspector Card */}
          {activeAudit.meta_checks && activeAudit.meta_checks.length > 0 && (
            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-500 text-lg">code</span>
                Meta Tag Diagnostics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeAudit.meta_checks.map((mc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={cn('w-2 h-2 rounded-full', mc.present ? 'bg-emerald-500' : 'bg-red-500')} />
                      <span className="font-mono font-bold text-foreground">{mc.tag}</span>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded font-mono text-[10px] truncate max-w-[200px]', mc.present ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500')}>
                      {mc.value || 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Results Breakdown */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-500">checklist</span>
              SEO Audit Findings & Recommendations
            </h3>
            <SeoResults findings={activeAudit.findings} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
