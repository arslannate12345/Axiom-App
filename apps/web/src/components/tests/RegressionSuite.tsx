'use client';

import { useState, useEffect } from 'react';
import type { RequestRecord } from '@/lib/supabase-service';
import { runRegressionTest } from '@/lib/testEngine';
import type { RegressionDiff } from '@/lib/testEngine';
import { useTestResultsStore } from '@/stores/testResultsStore';
import * as service from '@/lib/supabase-service';
import { executeRequest } from '@/lib/api';
import type { HttpMethod, BodyType } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { METHOD_COLORS } from '@/lib/constants';

export function RegressionSuite({ request }: { request: RequestRecord }) {
  const [tab, setTab] = useState<'snapshots' | 'contracts'>('snapshots');
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [diffs, setDiffs] = useState<RegressionDiff[] | null>(null);
  const setSectionResults = useTestResultsStore((s) => s.setSectionResults);

  useEffect(() => {
    if (diffs) setSectionResults('regression', { diffs });
  }, [diffs]);
  const [contractValid, setContractValid] = useState<boolean | null>(null);
  const [snapshots, setSnapshots] = useState<service.Snapshot[]>([]);
  const [contracts, setContracts] = useState<service.Contract[]>([]);

  useEffect(() => {
    service.getSnapshots(request.id).then(setSnapshots);
    service.getContracts(request.id).then(setContracts);
  }, [request.id]);

  const handleSaveBaseline = async () => {
    setIsSaving(true);
    try {
      const resp = await executeRequest({
        method: request.method as HttpMethod,
        url: request.url,
        headers: request.headers ?? [],
        queryParams: request.query_params ?? [],
        bodyType: (request.body_type as BodyType) ?? 'none',
        body: request.body ?? '',
      });
      await service.createSnapshot({
        request_id: request.id,
        name: `Baseline ${new Date().toLocaleString()}`,
        status_code: resp.status,
        response_headers: resp.headers,
        response_body: resp.body,
        response_size: resp.size,
        latency_ms: resp.totalTime,
        tags: [],
      });
      setSnapshots(await service.getSnapshots(request.id));
      toast.success('Baseline saved');
    } catch (err) {
      console.error('Failed to save baseline', err);
      toast.error((err as Error).message || 'Failed to save baseline');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      if (tab === 'snapshots') {
        const baseline = snapshots.length > 0 ? { body: snapshots[0].response_body ?? '', status: snapshots[0].status_code ?? 200 } : null;
        const res = await runRegressionTest(request, baseline);
        setDiffs(res.diffs);
      } else {
        setContractValid(true);
      }
      toast.success('Regression test complete');
    } catch (err) {
      console.error('Regression test failed', err);
      toast.error((err as Error).message || 'Regression test failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 bg-muted/20 border-b border-border flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs font-bold" style={{ color: METHOD_COLORS[request.method] || '#64748B' }}>{request.method}</span>
        <span className="text-xs font-mono text-foreground truncate">{request.url || '(no URL)'}</span>
      </div>
      <div className="flex-1 flex gap-6 overflow-auto p-6">
        <div className="w-[340px] shrink-0 space-y-4">
        <div className="bg-card border border-border p-5 rounded-lg">
          <h2 className="text-xs font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">history</span>Regression Testing
          </h2>
          <div className="flex bg-muted p-1 rounded mb-4">
            {(['snapshots', 'contracts'] as const).map((t) => (
              <button key={t}
                onClick={() => { setTab(t); setDiffs(null); setContractValid(null); }}
                className={`flex-1 py-2 text-[12px] font-semibold rounded transition-colors ${
                  tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >{t === 'snapshots' ? 'Snapshots' : 'Contracts'}</button>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            {tab === 'snapshots' && snapshots.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-background border border-border rounded p-2.5 text-xs">
                <div><p className="text-foreground font-medium">{s.name}</p><p className="text-[12px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p></div>
                <div className="flex gap-1">
                  <button onClick={handleRun} className="px-2 py-1 rounded bg-primary text-primary-foreground text-[12px] font-bold">Test</button>
                  <button className="text-muted-foreground hover:text-[#EF4444]"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </div>
            ))}
            {tab === 'contracts' && contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-background border border-border rounded p-2.5 text-xs">
                <div><p className="text-foreground font-medium">{c.name}</p><p className="text-[12px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p></div>
                <div className="flex gap-1">
                  <button onClick={handleRun} className="px-2 py-1 rounded bg-primary text-primary-foreground text-[12px] font-bold">Validate</button>
                  <button className="text-muted-foreground hover:text-[#EF4444]"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mb-4 text-center">
            {tab === 'snapshots' ? snapshots.length : contracts.length} baseline{tab === 'snapshots' ? snapshots.length !== 1 ? 's' : '' : contracts.length !== 1 ? 's' : ''} saved.
          </p>

          <Button onClick={handleSaveBaseline} disabled={isSaving}
            className="w-full h-9 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold">
            <span className="material-symbols-outlined text-sm mr-1">{tab === 'snapshots' ? 'camera' : 'description'}</span>
            {isSaving ? 'Saving...' : tab === 'snapshots' ? 'Save Baseline' : 'Infer Schema'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {diffs && tab === 'snapshots' && (
          <>
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${diffs.length === 0
              ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)] text-[#10B981]'
              : 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)] text-[#F59E0B]'}`}>
              <span className="material-symbols-outlined">{diffs.length === 0 ? 'check_circle' : 'warning'}</span>
              <span className="text-xs font-bold">{diffs.length === 0 ? 'No changes detected' : `${diffs.length} change(s) found`}</span>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              {diffs.map((d, i) => (
                <div key={i} className="flex items-start gap-3 text-xs font-mono bg-background rounded p-2.5 border border-border">
                  <span className={`text-[12px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                    d.kind === 'added' ? 'text-[#10B981] bg-[rgba(16,185,129,0.1)]'
                    : d.kind === 'changed' ? 'text-[#F59E0B] bg-[rgba(245,158,11,0.1)]'
                    : 'text-[#EF4444] bg-[rgba(239,68,68,0.1)]'
                  }`}>{d.kind}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground break-all">{d.path}</p>
                    <div className="flex gap-2 mt-1">
                      {d.lhs && <span className="text-[#EF4444] line-through truncate">{d.lhs}</span>}
                      {d.lhs && d.rhs && <span className="text-muted-foreground">→</span>}
                      {d.rhs && <span className="text-[#10B981] truncate">{d.rhs}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {contractValid !== null && tab === 'contracts' && (
          <div className={`flex items-center gap-2 p-4 rounded-lg border ${
            contractValid ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)] text-[#10B981]'
            : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#EF4444]'}`}>
            <span className="material-symbols-outlined text-lg">{contractValid ? 'check_circle' : 'error'}</span>
            <span className="text-xs font-bold">{contractValid ? 'Schema validation passed' : 'Schema validation failed'}</span>
          </div>
        )}

        {!diffs && contractValid === null && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center"><span className="material-symbols-outlined text-4xl text-muted-foreground block mb-2">history</span><p className="text-sm text-muted-foreground">Save a baseline and run a test</p></div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
