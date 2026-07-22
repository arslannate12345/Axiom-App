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
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      case 'B':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'C':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'D':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      default:
        return 'text-red-500 bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-8">
      {/* Top Header & URL Input */}
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-red-500 text-2xl">shield</span>
            <h1 className="text-2xl font-black text-foreground">Web Security Testing</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Perform instant security header audits, TLS verification, exposure probing, and vulnerability assessments.
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
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="h-11 px-6 rounded-xl font-bold text-white shadow-lg transition-all duration-200 hover:shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
                <span>Run Scan</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-medium flex items-center gap-2">
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
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Security Grade</p>
                <p className="text-xs text-muted-foreground mt-1">Based on headers & exposure</p>
              </div>
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border shadow-inner', getGradeColor(activeAudit.grade))}>
                {activeAudit.grade}
              </div>
            </div>

            {/* Security Score */}
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-black text-foreground mt-1">{activeAudit.score} / 100</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-sm border border-red-500/20">
                {activeAudit.score}%
              </div>
            </div>

            {/* Critical & High Findings */}
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Needed</p>
                <p className="text-2xl font-black text-red-500 mt-1">
                  {activeAudit.summary.criticalCount + activeAudit.summary.highCount} Issues
                </p>
              </div>
              <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
            </div>

            {/* Checks Passed */}
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Passed Checks</p>
                <p className="text-2xl font-black text-emerald-500 mt-1">{activeAudit.summary.passedCount}</p>
              </div>
              <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
            </div>
          </div>

          {/* Security Headers Breakdown */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[18px]">policy</span>
              HTTP Security Headers Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeAudit.header_analysis.map((hdr) => (
                <div key={hdr.header} className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{hdr.header}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', hdr.present ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
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
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[18px]">folder_off</span>
              Sensitive Path Exposure Check
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeAudit.exposed_paths.map((p) => (
                <div key={p.path} className="border border-border/80 rounded-lg p-3 bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground font-mono">{p.path}</p>
                    <p className="text-[11px] text-muted-foreground">HTTP {p.status}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', p.exposed && p.severity !== 'info' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500')}>
                    {p.exposed && p.severity !== 'info' ? 'EXPOSED' : 'SECURE'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Findings & Remediation */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">list_alt</span>
              Detailed Security Findings & Remediation
            </h3>
            <SecurityIssuesList findings={activeAudit.findings} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
