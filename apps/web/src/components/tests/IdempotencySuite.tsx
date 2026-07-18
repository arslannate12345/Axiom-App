'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DiffItem { kind: string; path: string[]; lhs?: unknown; rhs?: unknown; }

interface IdempotencyResult {
  isIdempotent: boolean;
  status1: number;
  status2: number;
  latency1: number;
  latency2: number;
  diffs: DiffItem[];
}

const MOCK: IdempotencyResult = {
  isIdempotent: true,
  status1: 200, status2: 200,
  latency1: 142, latency2: 148,
  diffs: [],
};

const MOCK_NOT: IdempotencyResult = {
  isIdempotent: false,
  status1: 201, status2: 201,
  latency1: 200, latency2: 210,
  diffs: [
    { kind: 'E', path: ['id'], lhs: '1029', rhs: '1030' },
    { kind: 'E', path: ['created_at'], lhs: '2024-01-01', rhs: '2024-01-02' },
  ],
};

export function IdempotencySuite() {
  const [mode, setMode] = useState<'sequential' | 'parallel'>('sequential');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IdempotencyResult | null>(null);

  const handleRun = () => {
    setIsRunning(true);
    toast.info('Idempotency test starting...');
    setTimeout(() => { setResult(MOCK); setIsRunning(false); toast.success('Test complete'); }, 2000);
  };

  return (
    <div className="flex-1 flex gap-6 overflow-auto p-6">
      <div className="w-[340px] shrink-0">
        <div className="bg-card border border-border p-5 rounded-lg">
          <h2 className="text-xs font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">balance</span>Idempotency Test
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Execution Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {(['sequential', 'parallel'] as const).map((m) => (
                  <button key={m}
                    onClick={() => setMode(m)}
                    className={`py-2 text-[10px] font-semibold rounded border transition-colors ${
                      mode === m ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-muted-foreground'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px] mr-1 align-text-bottom">{m === 'sequential' ? 'view_list' : 'bolt'}</span>
                    {m === 'sequential' ? 'Sequential' : 'Parallel'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{mode === 'sequential' ? 'Fires the request twice, one after the other.' : 'Fires both requests concurrently.'}</p>
            </div>
            <Button onClick={isRunning ? undefined : handleRun} disabled={isRunning}
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold">
              <span className="material-symbols-outlined text-sm mr-1">{isRunning ? 'progress_activity' : 'play_arrow'}</span>
              {isRunning ? 'Running...' : 'Run Idempotency Test'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {result && (
          <>
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              result.isIdempotent
                ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)] text-[#10B981]'
                : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#EF4444]'
            }`}>
              <span className="material-symbols-outlined">{result.isIdempotent ? 'check_circle' : 'error'}</span>
              <span className="text-xs font-bold uppercase">{result.isIdempotent ? 'Endpoint is Idempotent' : 'Not Idempotent'}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase mb-2">Request 1</p>
                <p className="text-sm font-bold text-foreground">{result.status1}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">{result.latency1}ms</p>
              </div>
              <div className="bg-card border border-border p-4 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase mb-2">Request 2</p>
                <p className="text-sm font-bold text-foreground">{result.status2}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">{result.latency2}ms</p>
              </div>
            </div>

            {result.diffs.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-[10px] font-bold text-[#F59E0B] uppercase mb-3">Differences Found ({result.diffs.length})</p>
                {result.diffs.map((d, i) => (
                  <div key={i} className="flex gap-3 text-xs font-mono py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground w-24 shrink-0">{d.path.join('.')}</span>
                    <span className="text-[#EF4444] line-through">{String(d.lhs ?? '')}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-[#10B981]">{String(d.rhs ?? '')}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {!result && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><span className="material-symbols-outlined text-4xl text-muted-foreground block mb-2">balance</span><p className="text-sm text-muted-foreground">Run an idempotency test to see results</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
