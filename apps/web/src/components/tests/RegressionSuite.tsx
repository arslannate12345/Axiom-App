'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Snapshot { id: string; name: string; createdAt: string; }
interface Contract { id: string; name: string; createdAt: string; }

interface DiffItem { path: string; kind: string; lhs?: string; rhs?: string; }

const MOCK_SNAPSHOTS: Snapshot[] = [
  { id: '1', name: 'Baseline v1', createdAt: '2024-01-15T10:30:00Z' },
];
const MOCK_CONTRACTS: Contract[] = [
  { id: '1', name: 'User Schema', createdAt: '2024-01-15T10:35:00Z' },
];
const MOCK_DIFFS: DiffItem[] = [
  { path: 'data.users[0].email', kind: 'changed', lhs: 'old@test.com', rhs: 'new@test.com' },
  { path: 'meta.cache_ttl', kind: 'added', rhs: '3600' },
];

export function RegressionSuite() {
  const [tab, setTab] = useState<'snapshots' | 'contracts'>('snapshots');
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [diffs, setDiffs] = useState<DiffItem[] | null>(null);
  const [contractValid, setContractValid] = useState<boolean | null>(null);

  const handleSaveBaseline = () => {
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); toast.success('Baseline saved'); }, 1000);
  };

  const handleRun = () => {
    setIsRunning(true);
    if (tab === 'snapshots') {
      setTimeout(() => { setDiffs(MOCK_DIFFS); setIsRunning(false); }, 1500);
    } else {
      setTimeout(() => { setContractValid(true); setIsRunning(false); }, 1500);
    }
  };

  return (
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
                className={`flex-1 py-2 text-[10px] font-semibold rounded transition-colors ${
                  tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >{t === 'snapshots' ? 'Snapshots' : 'Contracts'}</button>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            {tab === 'snapshots' && MOCK_SNAPSHOTS.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-background border border-border rounded p-2.5 text-xs">
                <div><p className="text-foreground font-medium">{s.name}</p><p className="text-[10px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p></div>
                <div className="flex gap-1">
                  <button onClick={handleRun} className="px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-bold">Test</button>
                  <button className="text-muted-foreground hover:text-[#EF4444]"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </div>
            ))}
            {tab === 'contracts' && MOCK_CONTRACTS.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-background border border-border rounded p-2.5 text-xs">
                <div><p className="text-foreground font-medium">{c.name}</p><p className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p></div>
                <div className="flex gap-1">
                  <button onClick={handleRun} className="px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-bold">Validate</button>
                  <button className="text-muted-foreground hover:text-[#EF4444]"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </div>
            ))}
          </div>

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
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
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
  );
}
