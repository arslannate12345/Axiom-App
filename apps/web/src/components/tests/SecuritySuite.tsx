'use client';

import { useState } from 'react';
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

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
  critical?: boolean;
}

const MOCK_RESULTS: CheckResult[] = [
  { id: 'https', label: 'HTTPS Enforced', status: 'pass', detail: '301 Redirect observed. HSTS headers present. Max-Age: 63072000; includeSubDomains; preload' },
  { id: 'headers', label: 'Sensitive Headers Not Exposed', status: 'pass', detail: 'No identifying server signatures found in response headers.' },
  { id: 'auth', label: 'Auth Required on Mutating Methods', status: 'pass', detail: '401 returned for all unauthenticated mutate requests across 24 endpoints.' },
  { id: 'rate-limit', label: 'Rate Limiting Active', status: 'warning', detail: 'Endpoint-specific limits are too permissive (allow 50 attempts/min).' },
  { id: 'cors', label: 'CORS Policy Strictness', status: 'fail', detail: 'CRITICAL: Access-Control-Allow-Origin set to wildcard (*). Allow-Credentials: true', critical: true },
];

export function SecuritySuite() {
  const [scanDepth, setScanDepth] = useState('L2');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggles, setToggles] = useState<AuditToggle[]>([
    { id: 'headers', label: 'Header Verification', enabled: true },
    { id: 'auth', label: 'Auth Scanning', enabled: true },
    { id: 'sqli', label: 'SQLi Protection', enabled: true },
    { id: 'exploit', label: 'Automated Exploitation', enabled: false },
  ]);

  const handleRun = () => {
    setIsRunning(true);
    toast.info('Security scan initializing...');
    setTimeout(() => {
      setResults(MOCK_RESULTS);
      setIsRunning(false);
      toast.success('Security scan completed');
    }, 2000);
  };

  const totalChecks = 42;
  const vulnerabilities = results?.filter((r) => r.status === 'fail').length ?? 0;
  const warnings = results?.filter((r) => r.status === 'warning').length ?? 0;
  const healthScore = results ? Math.max(0, 100 - (vulnerabilities * 15) - (warnings * 5)) : 88;

  return (
    <div className="flex-1 flex overflow-hidden border border-border rounded-lg" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Left: Scan Configuration */}
      <aside className="w-[280px] bg-card p-5 overflow-y-auto border-r border-border shrink-0">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          Scan Configuration
        </h2>

        <div className="space-y-5">
          <div>
            <label className="text-[11px] font-semibold text-foreground block mb-2">Scan Depth</label>
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
                <span className="text-[11px] text-muted-foreground">{t.label}</span>
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
          <ResultStatCard title="Total Checks" value={String(totalChecks)} subtitle="Baseline: 40 (+2)" />
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
            value={String(healthScore)}
            color="#6366F1"
            suffix="/ 100"
            barWidth={`${healthScore}%`}
          />
        </div>

        {/* Compliance Checklist */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-foreground">Compliance Checklist</h2>
          </div>

          <div className="space-y-[1px] bg-border rounded overflow-hidden">
            {(results ?? MOCK_RESULTS).map((check) => (
              <div key={check.id} className="bg-card hover:bg-muted transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                  className="w-full flex items-center px-4 h-11 text-left outline-none"
                >
                  <div className="w-7 flex items-center shrink-0">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{
                        color: check.status === 'pass' ? '#10B981'
                          : check.status === 'fail' ? '#EF4444' : '#F59E0B',
                      }}
                    >
                      {check.status === 'pass' ? 'check_circle'
                        : check.status === 'fail' ? 'error' : 'warning'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-medium text-foreground">{check.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                      style={{
                        color: check.status === 'pass' ? '#10B981'
                          : check.status === 'fail' ? '#EF4444' : '#F59E0B',
                        backgroundColor: check.status === 'pass' ? 'rgba(16,185,129,0.1)'
                          : check.status === 'fail' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
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
                    <pre className={`text-[10px] font-mono pt-3 leading-relaxed ${
                      check.critical ? 'text-[#EF4444] font-bold' : 'text-muted-foreground'
                    }`}>
                      {check.detail}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Event Log */}
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Live Security Event Log</span>
            <span className="text-[10px] font-mono text-primary animate-pulse">RECORDING...</span>
          </div>
          <div className="bg-background p-3 rounded text-[10px] font-mono text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            <div className="flex gap-3"><span className="text-muted-foreground shrink-0">14:02:11</span> <span className="text-primary">[INFO]</span> Initializing fuzzing engine for /v1/transactions...</div>
            <div className="flex gap-3"><span className="text-muted-foreground shrink-0">14:02:15</span> <span className="text-[#F59E0B]">[WARN]</span> Detected non-standard HTTP method &apos;PROPFIND&apos; response: 405</div>
            <div className="flex gap-3"><span className="text-muted-foreground shrink-0">14:02:44</span> <span className="text-[#10B981]">[PASS]</span> Token introspection validated successfully</div>
            <div className="flex gap-3"><span className="text-muted-foreground shrink-0">14:03:02</span> <span className="text-[#EF4444]">[ERR]</span> Potential SQLi sequence on &apos;sort_by&apos; parameter</div>
          </div>
        </div>
      </section>
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <h3 className="text-xl font-black leading-none" style={{ color: color || 'var(--foreground)' }}>
          {value}
        </h3>
        {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
      {subtitle && <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-mono">{subtitle}</p>}
      {barWidth && (
        <div className="w-full bg-background h-1 rounded-full mt-2 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: barWidth, backgroundColor: color || '#6366F1' }} />
        </div>
      )}
    </div>
  );
}