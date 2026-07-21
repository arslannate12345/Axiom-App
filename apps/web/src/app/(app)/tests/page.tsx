'use client';

import { useState, useEffect } from 'react';
import { BenchmarksSuite } from '@/components/tests/BenchmarksSuite';
import { SecuritySuite } from '@/components/tests/SecuritySuite';
import { FuzzSuite } from '@/components/tests/FuzzSuite';
import { ChaosSuite } from '@/components/tests/ChaosSuite';
import { IdempotencySuite } from '@/components/tests/IdempotencySuite';
import { RegressionSuite } from '@/components/tests/RegressionSuite';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import type { RequestRecord } from '@/lib/supabase-service';
import { useTestResultsStore } from '@/stores/testResultsStore';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import type { AggregatedSection } from '@/lib/reportGenerator';

type TestSuite = 'benchmarks' | 'regression' | 'fuzzing' | 'security' | 'chaos' | 'idempotency';

const SUITS: { id: TestSuite; label: string }[] = [
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'regression', label: 'Contracts & Regression' },
  { id: 'fuzzing', label: 'Fuzzing' },
  { id: 'idempotency', label: 'Idempotency' },
  { id: 'security', label: 'Security' },
  { id: 'chaos', label: 'Chaos' },
];

import { METHOD_COLORS } from '@/lib/constants';

export default function TestsPage() {
  const [active, setActive] = useState<TestSuite>('benchmarks');
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [savedRequests, setSavedRequests] = useState<RequestRecord[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [editUrl, setEditUrl] = useState('');

  const testStore = useTestResultsStore();

  useEffect(() => {
    if (selectedRequest) setEditUrl(selectedRequest.url);
  }, [selectedRequest?.id]);

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
          <div className="relative flex-1 max-w-2xl flex items-center gap-2">
            {/* Request picker button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="shrink-0 flex items-center gap-2 h-10 px-3 bg-background border border-border rounded-lg hover:border-primary/50 transition-colors"
              title="Select a saved request"
            >
              <span className="font-mono text-xs font-bold" style={{ color: selectedRequest ? METHOD_COLORS[selectedRequest.method] || '#64748B' : '#64748B' }}>
                {selectedRequest?.method || 'GET'}
              </span>
              <span className="material-symbols-outlined text-[14px] text-muted-foreground">{searchOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {/* Editable URL */}
            <Input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="flex-1 h-10 bg-background border-border text-xs font-mono text-foreground focus:border-primary"
              disabled={!selectedRequest}
            />
            {selectedRequest && (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await service.updateRequest(selectedRequest.id, { url: editUrl });
                    setSelectedRequest({ ...selectedRequest, url: editUrl });
                    toast.success('URL updated');
                  } catch { toast.error('Failed to save URL'); }
                }}
                className="h-10 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
              </Button>
            )}
            {searchOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden" style={{ maxWidth: '500px' }}>
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
          {selectedRequest && testStore.sections.length > 0 && (
            <Button
              onClick={() => setShowReportBuilder(true)}
              className="h-10 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            >
              <span className="material-symbols-outlined text-[14px] mr-1">description</span>
              Generate Report
            </Button>
          )}
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

      {selectedRequest && (
        <ReportBuilder
          open={showReportBuilder}
          onOpenChange={setShowReportBuilder}
          request={selectedRequest}
          sections={testStore.results as AggregatedSection}
        />
      )}
    </div>
  );
}
