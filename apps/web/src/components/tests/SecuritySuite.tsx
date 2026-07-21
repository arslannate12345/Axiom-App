'use client';

import { useState, useEffect } from 'react';
import type { RequestRecord } from '@/lib/supabase-service';
import { runSecurityScan } from '@/lib/testEngine';
import type { SecurityCheck, SecurityResult } from '@/lib/testEngine';
import { useTestResultsStore } from '@/stores/testResultsStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const SCAN_DEPTHS = [
  { value: 'L1', label: 'Surface (L1)' },
  { value: 'L2', label: 'Standard (L2)' },
  { value: 'L3', label: 'Exhaustive (L3)' },
  { value: 'L4', label: 'Deep Forensics (L4)' },
];

interface AuditToggle {
  id: string;
  label: string;
  enabled: boolean;
}

import { METHOD_COLORS } from '@/lib/constants';

const STATUS_ICON: Record<SecurityCheck['status'], string> = {
  pass: 'check_circle',
  fail: 'error',
  warning: 'warning',
};

const STATUS_COLOR: Record<SecurityCheck['status'], string> = {
  pass: '#10B981',
  fail: '#EF4444',
  warning: '#F59E0B',
};

const STATUS_BG: Record<SecurityCheck['status'], string> = {
  pass: 'rgba(16,185,129,0.1)',
  fail: 'rgba(239,68,68,0.1)',
  warning: 'rgba(245,158,11,0.1)',
};

export function SecuritySuite({ request }: { request: RequestRecord }) {
  const [scanDepth, setScanDepth] = useState('L2');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SecurityResult | null>(null);
  const setSectionResults = useTestResultsStore((s) => s.setSectionResults);

  useEffect(() => {
    if (result) setSectionResults('security', result);
  }, [result]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggles, setToggles] = useState<AuditToggle[]>([
    { id: 'headers', label: 'Header Verification', enabled: true },
    { id: 'auth', label: 'Auth Scanning', enabled: true },
    { id: 'sqli', label: 'SQLi Protection', enabled: true },
    { id: 'exploit', label: 'Automated Exploitation', enabled: false },
  ]);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await runSecurityScan(request, {
        depth: scanDepth,
        toggles: toggles.filter((t) => t.enabled).map((t) => t.id),
      });
      setResult(res);
      toast.success(`Security scan complete: ${res.healthScore}/100 health score`);
    } catch {
      toast.error('Security scan failed');
    } finally {
      setIsRunning(false);
    }
  };

  const totalChecks = result?.totalChecks ?? 0;
  const vulnerabilities = result?.vulnerabilities ?? 0;
  const warnings = result?.warnings ?? 0;
  const healthScore = result ? String(result.healthScore) : '—';
  const healthBar = result ? `${result.healthScore}%` : '0%';

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="px-6 py-3 bg-muted/20 border-b border-border flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs font-bold" style={{ color: METHOD_COLORS[request.method] || '#64748B' }}>{request.method}</span>
        <span className="text-xs font-mono text-foreground truncate">{request.url || '(no URL)'}</span>
      </div>
      <div className="flex-1 flex overflow-hidden border border-border rounded-lg">
        {/* Left: Scan Configuration */}
      <aside className="w-[280px] bg-card p-5 overflow-y-auto border-r border-border shrink-0">
        <h2 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          Scan Configuration
        </h2>

        <div className="space-y-5">
          <div>
            <label className="text-[13px] font-semibold text-foreground block mb-2">Scan Depth</label>
            <Select value={scanDepth} onValueChange={setScanDepth}>
              <SelectTrigger className="w-full h-8 bg-background border-border text-xs text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {SCAN_DEPTHS.map((d) => (
                  <SelectItem key={d.value} value={d.value} className="text-xs">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-4 border-t border-border/30">
            {toggles.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{t.label}</span>
                <Switch
                  checked={t.enabled}
                  onCheckedChange={(checked) =>
                    setToggles((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: checked } : x)))
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button
              onClick={isRunning ? undefined : handleRun}
              disabled={isRunning}
              className="w-full h-9 bg-primary/10 border border-primary/30 text-primary text-xs hover:bg-primary/20"
            >
              <span className="material-symbols-outlined text-sm mr-1">security</span>
              {isRunning ? 'Scanning...' : 'Initialize Security Scan'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Right: Results */}
      <section className="flex-1 overflow-y-auto p-5 bg-background">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <ResultStatCard
            title="Total Checks"
            value={String(totalChecks)}
            subtitle={result ? `${result.checks.length} checks executed` : '—'}
          />
          <ResultStatCard
            title="Vulnerabilities"
            value={String(vulnerabilities)}
            color="#EF4444"
            subtitle="Critical Severity"
          />
          <ResultStatCard
            title="Warnings"
            value={String(warnings)}
            color="#F59E0B"
            subtitle="Non-Blocking Alerts"
          />
          <ResultStatCard
            title="Health Score"
            value={healthScore}
            color="#6366F1"
            suffix="/ 100"
            barWidth={healthBar}
          />
        </div>

        {/* Compliance Checklist */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-foreground">Compliance Checklist</h2>
          </div>

          {result ? (
            <div className="space-y-[1px] bg-border rounded overflow-hidden">
              {result.checks.map((check) => (
                <div key={check.id} className="bg-card hover:bg-muted transition-colors">
                  <button
                    onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                    className="w-full flex items-center px-4 h-11 text-left outline-none"
                  >
                    <div className="w-7 flex items-center shrink-0">
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: STATUS_COLOR[check.status] }}
                      >
                        {STATUS_ICON[check.status]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-foreground">{check.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-[12px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{
                          color: STATUS_COLOR[check.status],
                          backgroundColor: STATUS_BG[check.status],
                        }}
                      >
                        {check.status === 'pass' ? 'Pass'
                          : check.status === 'fail' ? 'Fail' : 'Warning'}
                      </span>
                      <span
                        className={`material-symbols-outlined text-sm text-muted-foreground transition-transform ${
                          expandedId === check.id ? 'rotate-180' : ''
                        }`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>
                  {expandedId === check.id && (
                    <div className="px-11 pb-3 border-t border-border/30 bg-background/50">
                      <pre className={`text-[12px] font-mono pt-3 leading-relaxed ${
                        check.critical ? 'text-[#EF4444] font-bold' : 'text-muted-foreground'
                      }`}>
                        {check.detail}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Run a scan to see compliance results.
            </div>
          )}
        </div>

        {/* Live Event Log */}
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-mono text-muted-foreground uppercase tracking-widest">Live Security Event Log</span>
            {result && <span className="text-[12px] font-mono text-[#10B981]">SCAN COMPLETE</span>}
          </div>
          <div className="bg-background p-3 rounded text-[12px] font-mono text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {result ? (
              result.checks.map((check, i) => {
                const now = new Date();
                const t = new Date(now.getTime() - (result.checks.length - i) * 3000);
                const ts = t.toLocaleTimeString('en-US', { hour12: false });
                const tag = check.status === 'fail' ? 'ERR' : check.status === 'warning' ? 'WARN' : 'PASS';
                const tagColor = check.status === 'fail' ? '#EF4444' : check.status === 'warning' ? '#F59E0B' : '#10B981';
                return (
                  <div key={check.id} className="flex gap-3">
                    <span className="text-muted-foreground shrink-0">{ts}</span>
                    <span style={{ color: tagColor }}>[{tag}]</span>
                    <span>{check.label}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex gap-3">
                <span className="text-muted-foreground shrink-0">--:--:--</span>
                <span className="text-muted-foreground">Run a scan to see events.</span>
              </div>
            )}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

// ─── Result Stat Card ─────────────────────────────────────

function ResultStatCard({
  title,
  value,
  color,
  subtitle,
  suffix,
  barWidth,
}: {
  title: string;
  value: string;
  color?: string;
  subtitle?: string;
  suffix?: string;
  barWidth?: string;
}) {
  return (
    <div className={`bg-card p-4 rounded border border-border ${color ? '' : ''}`}
      style={color ? { borderColor: `${color}33` } : {}}
    >
      <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <h3 className="text-xl font-black leading-none" style={{ color: color || 'var(--foreground)' }}>
          {value}
        </h3>
        {suffix && <span className="text-[12px] text-muted-foreground">{suffix}</span>}
      </div>
      {subtitle && <p className="text-[12px] text-muted-foreground/60 mt-1.5 font-mono">{subtitle}</p>}
      {barWidth && (
        <div className="w-full bg-background h-1 rounded-full mt-2 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: barWidth, backgroundColor: color || '#6366F1' }} />
        </div>
      )}
    </div>
  );
}
