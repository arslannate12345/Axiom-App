'use client';

import { useState } from 'react';
import type { RequestRecord } from '@/lib/supabase-service';
import { runChaosTest } from '@/lib/testEngine';
import type { ChaosIteration } from '@/lib/testEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const METHOD_COLORS: Record<string, string> = { GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B', PATCH: '#8B5CF6', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#EC4899' };

export function ChaosSuite({ request }: { request: RequestRecord }) {
  const [iterations, setIterations] = useState('20');
  const [minLatency, setMinLatency] = useState('0');
  const [maxLatency, setMaxLatency] = useState('3000');
  const [dropProb, setDropProb] = useState('10');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ChaosIteration[] | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await runChaosTest(request, {
        iterations: parseInt(iterations) || 20,
        minLatencyMs: parseInt(minLatency) || 0,
        maxLatencyMs: parseInt(maxLatency) || 3000,
        dropProbability: parseInt(dropProb) || 10,
      });
      setResults(res);
      toast.success(`Chaos test complete: ${res.filter((r) => r.status === 'passed').length} passed`);
    } catch {
      toast.error('Chaos test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const passed = results?.filter((r) => r.status === 'passed').length ?? 0;
  const dropped = results?.filter((r) => r.status === 'dropped').length ?? 0;
  const failed = results?.filter((r) => r.status === 'failed').length ?? 0;

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
            <span className="material-symbols-outlined text-sm">flash_on</span>Chaos Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Iterations</label>
              <Input type="number" value={iterations} onChange={(e) => setIterations(e.target.value)}
                className="bg-background border-border text-foreground text-xs font-mono focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Min Latency (ms)</label>
                <Input type="number" value={minLatency} onChange={(e) => setMinLatency(e.target.value)}
                  className="bg-background border-border text-foreground text-xs font-mono focus:border-primary" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Max Latency (ms)</label>
                <Input type="number" value={maxLatency} onChange={(e) => setMaxLatency(e.target.value)}
                  className="bg-background border-border text-foreground text-xs font-mono focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Drop Probability (%)</label>
              <Input type="number" value={dropProb} onChange={(e) => setDropProb(e.target.value)}
                className="bg-background border-border text-foreground text-xs font-mono focus:border-primary" />
            </div>
            <Button onClick={isRunning ? undefined : handleRun} disabled={isRunning}
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold">
              <span className="material-symbols-outlined text-sm mr-1">{isRunning ? 'progress_activity' : 'play_arrow'}</span>
              {isRunning ? 'Running...' : 'Start Chaos'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {results && (
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="bg-card border border-border p-4 rounded-lg text-center">
              <p className="text-xl font-bold font-mono text-[#10B981]">{passed}</p>
              <p className="text-[12px] text-muted-foreground uppercase font-semibold mt-0.5">Passed</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-lg text-center">
              <p className="text-xl font-bold font-mono text-[#F59E0B]">{dropped}</p>
              <p className="text-[12px] text-muted-foreground uppercase font-semibold mt-0.5">Dropped</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-lg text-center">
              <p className="text-xl font-bold font-mono text-[#EF4444]">{failed}</p>
              <p className="text-[12px] text-muted-foreground uppercase font-semibold mt-0.5">Failed</p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {(results ?? []).map((r) => (
            <div key={r.iteration} className="flex items-center gap-4 bg-card border border-border rounded p-3 text-xs">
              <span className="text-muted-foreground font-mono w-8">#{r.iteration}</span>
              <span className="text-muted-foreground font-mono w-16">+{r.injectedLatencyMs}ms</span>
              <span className={`text-[12px] font-bold uppercase px-2 py-0.5 rounded ${
                r.status === 'passed' ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981]'
                : r.status === 'dropped' ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
                : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]'
              }`}>{r.status}</span>
              {r.responseStatus && <span className="text-muted-foreground font-mono ml-auto">Status {r.responseStatus}</span>}
              {r.totalTimeMs && <span className="text-muted-foreground font-mono">{r.totalTimeMs}ms</span>}
            </div>
          ))}
        </div>
        {!results && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><span className="material-symbols-outlined text-4xl text-muted-foreground block mb-2">flash_on</span><p className="text-sm text-muted-foreground">Run a chaos test to see results</p></div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
