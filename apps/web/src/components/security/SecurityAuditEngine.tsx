'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useSecurityStore } from '@/stores/securityStore';
import { SecurityIssuesList } from './SecurityIssuesList';
import { cn } from '@/lib/utils';

export function SecurityAuditEngine() {
  const { targetUrl, setTargetUrl, isScanning, activeAudit, error, startScan } = useSecurityStore();
  const [inputUrl, setInputUrl] = useState(targetUrl || 'https://example.com');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setTargetUrl(inputUrl);
    startScan(inputUrl);
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]';
      case 'B':
        return 'text-blue-400 bg-blue-950/40 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.25)]';
      case 'C':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
      case 'D':
        return 'text-orange-400 bg-orange-950/40 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.25)]';
      default:
        return 'text-red-400 bg-red-950/40 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)]';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-8">
      {/* Top Header & URL Input */}
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-lg shadow-red-500/30">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Header Policy & Web Security Audit</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time HTTP response header inspection, TLS verification, cookie flags, and exposed path probing.
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
              placeholder="https://example.com or domain..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="h-11 px-6 rounded-xl font-extrabold text-white shadow-lg shadow-red-500/25 transition-all duration-200 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
          >
            {isScanning ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">security</span>
                <span>Re-scan Header Policy</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}
      </div>

      {/* Main Results Dashboard */}
      {activeAudit && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto w-full space-y-6"
        >
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Security Grade */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Security Grade</p>
                <p className="text-xs text-muted-foreground/80 mt-1">Based on headers & exposure</p>
              </div>
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border', getGradeColor(activeAudit.grade))}>
                {activeAudit.grade}
              </div>
            </div>

            {/* Security Score */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Overall Score</p>
                <p className="text-3xl font-black text-foreground mt-1">{activeAudit.score} <span className="text-sm font-semibold opacity-60">/ 100</span></p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 font-extrabold text-sm border border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                {activeAudit.score}%
              </div>
            </div>

            {/* Critical & High Findings */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Action Needed</p>
                <p className="text-3xl font-black text-red-400 mt-1">
                  {activeAudit.summary.criticalCount + activeAudit.summary.highCount} <span className="text-xs font-semibold text-muted-foreground">Issues</span>
                </p>
              </div>
              <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
            </div>

            {/* Checks Passed */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Passed Checks</p>
                <p className="text-3xl font-black text-emerald-400 mt-1">{activeAudit.summary.passedCount}</p>
              </div>
              <span className="material-symbols-outlined text-emerald-400 text-3xl">verified</span>
            </div>
          </div>

          {/* Security Headers Breakdown */}
          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold tracking-wide text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400 text-[20px]">policy</span>
              HTTP Security Headers Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeAudit.header_analysis.map((hdr) => (
                <div key={hdr.header} className="border border-white/10 rounded-xl p-3.5 bg-slate-950/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{hdr.header}</span>
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider', hdr.present ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30')}>
                      {hdr.present ? 'PASS' : 'MISSING'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {hdr.present ? hdr.value || 'Configured' : 'Not set'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Exposed Paths Probe */}
          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold tracking-wide text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[20px]">folder_off</span>
              Sensitive Path Exposure Check
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeAudit.exposed_paths.map((p) => (
                <div key={p.path} className="border border-white/10 rounded-xl p-3.5 bg-slate-950/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-foreground font-mono">{p.path}</p>
                    <p className="text-[11px] text-muted-foreground">HTTP {p.status}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider', p.exposed && p.severity !== 'info' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30')}>
                    {p.exposed && p.severity !== 'info' ? 'EXPOSED' : 'SECURE'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Findings & Remediation */}
          <div className="space-y-4">
            <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400">list_alt</span>
              Detailed Security Findings & Remediation Engine
            </h3>
            <SecurityIssuesList findings={activeAudit.findings} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
