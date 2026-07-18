'use client';

import { useState, useEffect } from 'react';
import { BenchmarksSuite } from '@/components/tests/BenchmarksSuite';
import { SecuritySuite } from '@/components/tests/SecuritySuite';
import { FuzzSuite } from '@/components/tests/FuzzSuite';
import { ChaosSuite } from '@/components/tests/ChaosSuite';
import { IdempotencySuite } from '@/components/tests/IdempotencySuite';
import { RegressionSuite } from '@/components/tests/RegressionSuite';
import { Input } from '@/components/ui/input';
import * as service from '@/lib/supabase-service';
import type { RequestRecord } from '@/lib/supabase-service';

type TestSuite = 'benchmarks' | 'regression' | 'fuzzing' | 'security' | 'chaos' | 'idempotency';

const SUITS: { id: TestSuite; label: string }[] = [
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'regression', label: 'Contracts & Regression' },
  { id: 'fuzzing', label: 'Fuzzing' },
  { id: 'idempotency', label: 'Idempotency' },
  { id: 'security', label: 'Security' },
  { id: 'chaos', label: 'Chaos' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B',
  PATCH: '#8B5CF6', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#EC4899',
};

export default function TestsPage() {
  const [active, setActive] = useState<TestSuite>('benchmarks');
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [savedRequests, setSavedRequests] = useState<RequestRecord[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const ws = await service.getWorkspaces();
    if (ws.length === 0) return;
    const cols = await service.getCollections(ws[0].id);
    const allReqs: RequestRecord[] = [];
    for (const col of cols) {
      const reqs = await service.getRequests(col.id);
      allReqs.push(...reqs);
    }
    setSavedRequests(allReqs);
  };

  const filtered = searchQuery.trim()
    ? savedRequests.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.url.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : savedRequests;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Request Selector */}
      <div className="px-6 py-4 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Target Request</label>
          <div className="relative flex-1 max-w-xl">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-full flex items-center gap-3 h-10 px-4 bg-background border border-border rounded-lg text-left hover:border-primary/50 transition-colors"
            >
              {selectedRequest ? (
                <>
                  <span className="font-mono text-xs font-bold shrink-0" style={{ color: METHOD_COLORS[selectedRequest.method] || '#64748B' }}>
                    {selectedRequest.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{selectedRequest.name}</p>
                    <p className="text-[12px] text-muted-foreground font-mono truncate">{selectedRequest.url}</p>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">unfold_more</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">search</span>
                  <span className="text-xs text-muted-foreground">Select a saved request to test...</span>
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground ml-auto">unfold_more</span>
                </>
              )}
            </button>
            {searchOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search requests..."
                    className="h-8 bg-background border-border text-xs"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No requests found</p>
                  ) : (
                    filtered.map((req) => (
                      <button
                        key={req.id}
                        onClick={() => { setSelectedRequest(req); setSearchOpen(false); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors ${
                          selectedRequest?.id === req.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <span className="font-mono text-[12px] font-bold w-12 shrink-0" style={{ color: METHOD_COLORS[req.method] || '#64748B' }}>
                          {req.method}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{req.name}</p>
                          <p className="text-[12px] text-muted-foreground font-mono truncate">{req.url}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {/* Click-outside backdrop */}
            {searchOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            )}
          </div>
        </div>
      </div>

      {/* Suite tabs */}
      <div className="flex gap-6 px-6 pt-3 border-b border-border/30 bg-card/50 overflow-x-auto shrink-0">
        {SUITS.map((s) => (
          <button key={s.id} onClick={() => active !== s.id && setActive(s.id)}
            className={`pb-3 px-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              active === s.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >{s.label}</button>
        ))}
      </div>

      {/* Suite content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {!selectedRequest ? (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
            <span className="material-symbols-outlined text-5xl mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>science</span>
            <p className="text-sm font-medium mb-1">Select a Request to Begin Testing</p>
            <p className="text-xs">Choose a saved request above to run benchmarks, security scans, fuzz tests, and more.</p>
          </div>
        ) : (
          <>
            {active === 'benchmarks' && <BenchmarksSuite request={selectedRequest} />}
            {active === 'regression' && <RegressionSuite request={selectedRequest} />}
            {active === 'fuzzing' && <FuzzSuite request={selectedRequest} />}
            {active === 'security' && <SecuritySuite request={selectedRequest} />}
            {active === 'chaos' && <ChaosSuite request={selectedRequest} />}
            {active === 'idempotency' && <IdempotencySuite request={selectedRequest} />}
          </>
        )}
      </div>
    </div>
  );
}
