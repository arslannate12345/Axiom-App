'use client';

import { useState } from 'react';
import type { RequestRecord } from '@/lib/supabase-service';
import { runFuzzTest, FUZZ_STRATEGIES } from '@/lib/testEngine';
import type { FuzzResult } from '@/lib/testEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const METHOD_COLORS: Record<string, string> = { GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B', PATCH: '#8B5CF6', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#EC4899' };

export function FuzzSuite({ request }: { request: RequestRecord }) {
  const [active, setActive] = useState<Set<string>>(new Set(FUZZ_STRATEGIES.map((s) => s.id)));
  const [iterations, setIterations] = useState('10');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<FuzzResult[] | null>(null);

  const toggle = (id: string) => {
    const next = new Set(active);
    next.has(id) ? next.delete(id) : next.add(id);
    setActive(next);
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await runFuzzTest(request, {
        strategies: Array.from(active),
        iterations: parseInt(iterations) || 10,
      });
      setResults(res);
      toast.success(`Fuzz test complete: ${res.length} strategies tested`);
    } catch {
      toast.error('Fuzz test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const totalSafe = results?.reduce((s, r) => s + r.safe, 0) ?? 0;
  const totalCrash = results?.reduce((s, r) => s + r.crash, 0) ?? 0;
  const totalTimeout = results?.reduce((s, r) => s + r.timeout, 0) ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 bg-muted/20 border-b border-border flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs font-bold" style={{ color: METHOD_COLORS[request.method] || '#64748B' }}>{request.method}</span>
        <span className="text-xs font-mono text-foreground truncate">{request.url || '(no URL)'}</span>
      </div>
      <div className="flex-1 flex gap-6 overflow-auto p-6">
        <div className="w-[340px] shrink-0">
        <div className="bg-card border border-border p-5 rounded-lg">
          <h2 className="text-xs font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">shuffle</span>Fuzz Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Mutation Strategies</label>
              <div className="flex flex-wrap gap-2">
                {FUZZ_STRATEGIES.map((s) => (
                  <button key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`px-3 py-1.5 rounded text-[12px] font-semibold border transition-colors ${
                      active.has(s.id) ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-muted-foreground'
                    }`}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Iterations per Strategy</label>
              <Input type="number" value={iterations} onChange={(e) => setIterations(e.target.value)}
                className="bg-background border-border text-foreground text-xs font-mono focus:border-primary" />
            </div>
            <Button onClick={isRunning ? undefined : handleRun} disabled={isRunning}
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold">
              <span className="material-symbols-outlined text-sm mr-1">{isRunning ? 'progress_activity' : 'play_arrow'}</span>
              {isRunning ? 'Fuzzing...' : 'Run Fuzz Test'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {results && (
          <div className="grid grid-cols-3 gap-3 mb-2">
            <StatBadge label="Safe" value={String(totalSafe)} color="#10B981" />
            <StatBadge label="Crashes" value={String(totalCrash)} color="#EF4444" />
            <StatBadge label="Timeouts" value={String(totalTimeout)} color="#F59E0B" />
          </div>
        )}
        <div className="space-y-3">
          {(results ?? []).map((r) => (
            <div key={r.strategy} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between bg-muted/20 border-b border-border">
                <span className="text-xs font-semibold text-foreground">{r.strategy}</span>
                <span className="text-[12px] text-muted-foreground font-mono">{r.total} iterations</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="p-3 text-center"><p className="text-lg font-bold font-mono text-[#10B981]">{r.safe}</p><p className="text-[12px] text-muted-foreground uppercase">Safe</p></div>
                <div className="p-3 text-center"><p className="text-lg font-bold font-mono text-[#EF4444]">{r.crash}</p><p className="text-[12px] text-muted-foreground uppercase">Crash</p></div>
                <div className="p-3 text-center"><p className="text-lg font-bold font-mono text-[#F59E0B]">{r.timeout}</p><p className="text-[12px] text-muted-foreground uppercase">Timeout</p></div>
              </div>
            </div>
          ))}
        </div>
        {!results && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><span className="material-symbols-outlined text-4xl text-muted-foreground block mb-2">shuffle</span><p className="text-sm text-muted-foreground">Run a fuzz test to see results</p></div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border p-4 rounded-lg text-center">
      <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-[12px] text-muted-foreground uppercase font-semibold mt-0.5">{label}</p>
    </div>
  );
}
