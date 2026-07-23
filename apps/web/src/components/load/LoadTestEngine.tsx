'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useLoadStore } from '@/stores/loadStore';
import { LoadTestResults } from './LoadTestResults';
import { cn } from '@/lib/utils';

export function LoadTestEngine() {
  const { config, setConfig, isRunning, activeAudit, error, startTest } = useLoadStore();
  const [inputUrl, setInputUrl] = useState(config.url || 'https://api.github.com');
  const [vus, setVus] = useState(config.virtualUsers || 25);
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>(config.method || 'GET');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    const cfg = { ...config, url: inputUrl, virtualUsers: vus, method };
    setConfig(cfg);
    startTest(cfg);
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-950/40 border-emerald-500/40 shadow-sm';
      case 'B':
        return 'text-purple-600 dark:text-purple-400 bg-white dark:bg-purple-950/40 border-purple-500/40 shadow-sm';
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
      {/* Top Header & Input Controls */}
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-rose-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                dataset_linked
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Load & Stress Testing Engine</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Simulate virtual users (VU), measure server throughput (RPS), error rates, and p50/p95/p99 response latency percentiles.
          </p>
        </div>

        {/* Input Bar & Concurrency Config */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="h-11 px-3 rounded-xl border border-border/80 bg-white dark:bg-slate-900/60 font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]">
                link
              </span>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://api.example.com or route URL..."
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-border/80 bg-white dark:bg-slate-900/60 backdrop-blur-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-card border border-border/80 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4 flex-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Virtual Users (VU): <span className="text-purple-600 dark:text-purple-400 font-mono font-black">{vus} VU</span>
              </span>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={vus}
                onChange={(e) => setVus(Number(e.target.value))}
                className="flex-1 accent-purple-600 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="h-10 px-6 rounded-xl font-extrabold text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #E11D48 100%)' }}
            >
              {isRunning ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                  <span>Simulating VU Load...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">dataset_linked</span>
                  <span>Execute Load Test</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}
      </div>

      {/* Main Test Display */}
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
                  Resilience & Load Score
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
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Virtual Users</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {activeAudit.config.virtualUsers}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">VU</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Simulated concurrent users</span>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Error Rate</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className={cn('text-2xl font-black', activeAudit.summary.errorRatePercentage > 0 ? 'text-red-500' : 'text-emerald-500')}>
                  {activeAudit.summary.errorRatePercentage}%
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">{activeAudit.summary.failedRequests} failed requests</span>
            </div>
          </div>

          {/* Test Results Breakdown */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500">analytics</span>
              Load Performance & Latency Analytics
            </h3>
            <LoadTestResults audit={activeAudit} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
