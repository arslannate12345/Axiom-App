'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

interface RunnerStep {
  requestId: string;
  method: string;
  name: string;
  url: string;
  status: StepStatus;
  latencyMs?: number;
  statusCode?: number;
  error?: string;
  extractions?: Record<string, string>;
  assertionFailures?: string[];
}

interface CollectionRunnerViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  steps: RunnerStep[];
}

export function CollectionRunnerView({
  open,
  onOpenChange,
  collectionName,
  steps: initialSteps,
}: CollectionRunnerViewProps) {
  const [steps, setSteps] = useState<RunnerStep[]>(initialSteps);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'completed' | 'cancelled' | 'failed'>('idle');
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [totalDuration, setTotalDuration] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const abortRef = useRef(false);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (open) {
      setSteps(initialSteps.map((s) => ({ ...s, status: 'pending' as StepStatus })));
      setRunStatus('idle');
      setActiveStepIndex(-1);
      setTotalDuration(0);
      abortRef.current = false;
    }
  }, [open, initialSteps]);

  const handleStart = useCallback(async () => {
    setRunStatus('running');
    startTimeRef.current = Date.now();
    abortRef.current = false;

    for (let i = 0; i < steps.length; i++) {
      if (abortRef.current) {
        setRunStatus('cancelled');
        return;
      }

      setActiveStepIndex(i);
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: 'running' as StepStatus } : s)));

      // Simulate execution delay
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

      const passed = Math.random() > 0.15;
      const latency = Math.floor(Math.random() * 200) + 50;

      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? {
                ...s,
                status: (passed ? 'passed' : 'failed') as StepStatus,
                latencyMs: latency,
                statusCode: passed ? 200 : 500,
                error: passed ? undefined : 'Internal Server Error',
                extractions: passed ? { token: 'eyJhbGciOiJIUzI1NiIs...' } : undefined,
                assertionFailures: passed ? undefined : ['Expected status 200, got 500'],
              }
            : s,
        ),
      );
    }

    if (!abortRef.current) {
      setTotalDuration(Date.now() - startTimeRef.current);
      setRunStatus('completed');
      toast.success('Collection run completed');
    }
  }, [steps]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    setRunStatus('cancelled');
    toast.info('Run cancelled');
  }, []);

  const handleReset = useCallback(() => {
    setSteps(initialSteps.map((s) => ({ ...s, status: 'pending' as StepStatus })));
    setRunStatus('idle');
    setActiveStepIndex(-1);
    setTotalDuration(0);
    abortRef.current = false;
  }, [initialSteps]);

  const passedCount = steps.filter((s) => s.status === 'passed').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;

  const summary = {
    passed: passedCount,
    failed: failedCount,
    total: steps.length,
    duration: totalDuration,
    hasAssertions: steps.some((s) => s.assertionFailures && s.assertionFailures.length > 0),
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[500px] max-w-full bg-[#0F172A] border-l border-[#334155] text-[#e4e1ed] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-[#334155] bg-[rgba(15,23,42,0.9)]">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-bold text-[#e4e1ed]">Collection Runner</SheetTitle>
              <span className="text-[10px] text-[#64748B] font-mono">{collectionName}</span>
            </div>
          </SheetHeader>

          {/* Summary bar */}
          <div className="px-5 py-3 bg-[#1E293B] border-b border-[#334155] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#94A3B8]">
                {runStatus === 'idle' && 'Ready to run'}
                {runStatus === 'running' && `Running step ${activeStepIndex + 1} of ${steps.length}...`}
                {runStatus === 'completed' && `${summary.passed}/${summary.total} passed`}
                {runStatus === 'cancelled' && 'Run cancelled'}
                {runStatus === 'failed' && 'Run failed'}
              </span>
              {runStatus === 'completed' && (
                <span className="text-[10px] text-[#64748B] ml-3">
                  {Math.round(summary.duration / 1000)}s total
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {runStatus === 'idle' && (
                <Button
                  onClick={handleStart}
                  className="h-7 px-3 text-[10px] bg-[#6366F1] hover:bg-[#4F46E5] text-white"
                >
                  <span className="material-symbols-outlined text-[12px] mr-1">play_arrow</span>
                  Start Run
                </Button>
              )}
              {runStatus === 'running' && (
                <Button
                  onClick={handleCancel}
                  className="h-7 px-3 text-[10px] bg-[#EF4444] hover:bg-[#DC2626] text-white"
                >
                  <span className="material-symbols-outlined text-[12px] mr-1">stop</span>
                  Cancel
                </Button>
              )}
              {runStatus === 'completed' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowReportModal(true)}
                    className="h-7 px-3 text-[10px] bg-[#10B981] hover:bg-[#059669] text-white"
                  >
                    <span className="material-symbols-outlined text-[12px] mr-1">description</span>
                    Generate Report
                  </Button>
                  <Button
                    onClick={handleReset}
                    className="h-7 px-3 text-[10px] bg-[#6366F1] hover:bg-[#4F46E5] text-white"
                  >
                    <span className="material-symbols-outlined text-[12px] mr-1">refresh</span>
                    Run Again
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Steps list */}
          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepCard
                  key={step.requestId}
                  step={step}
                  isActive={index === activeStepIndex}
                  runStatus={runStatus}
                  index={index}
                />
              ))}
            </div>

            {steps.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <p className="text-xs text-[#475569]">No requests in this collection</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Step Card ────────────────────────────────────────────

function StepCard({
  step,
  isActive,
  index,
}: {
  step: RunnerStep;
  isActive: boolean;
  runStatus: string;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const methodColors: Record<string, string> = {
    GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B',
    PATCH: '#8B5CF6', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#EC4899',
  };

  const getStatusIcon = () => {
    switch (step.status) {
      case 'pending':
        return <span className="material-symbols-outlined text-sm text-[#64748B]">schedule</span>;
      case 'running':
        return <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />;
      case 'passed':
        return <span className="material-symbols-outlined text-sm text-[#10B981]">check_circle</span>;
      case 'failed':
        return <span className="material-symbols-outlined text-sm text-[#EF4444]">close_circle</span>;
      case 'skipped':
        return <span className="material-symbols-outlined text-sm text-[#64748B]">redo</span>;
    }
  };

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isActive && step.status === 'running'
          ? 'border-[#6366F1] bg-[rgba(99,102,241,0.05)]'
          : 'border-[#1E293B] bg-[#0F172A]'
      }`}
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-center gap-3">
          {/* Method badge */}
          <span
            className="text-[10px] font-bold w-12 shrink-0"
            style={{ color: methodColors[step.method] || '#64748B' }}
          >
            {step.method}
          </span>

          {/* Step name */}
          <span className="flex-1 text-xs text-[#e4e1ed] truncate">{step.name || `Request ${index + 1}`}</span>

          {/* Status icon */}
          <div className="w-5 flex items-center justify-center">{getStatusIcon()}</div>
        </div>

        {/* Details (expandable) */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#1E293B] space-y-2">
            <div className="text-[10px] font-mono text-[#94A3B8] break-all">{step.url}</div>
            {step.statusCode && (
              <div className="flex gap-3 text-[10px]">
                <span className="text-[#64748B]">Status:</span>
                <Badge className={`text-[10px] px-1.5 py-0 ${
                  step.statusCode < 400 ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                }`}>
                  {step.statusCode}
                </Badge>
                {step.latencyMs !== undefined && (
                  <>
                    <span className="text-[#64748B]">Latency:</span>
                    <span className="text-[#94A3B8] font-mono">{step.latencyMs}ms</span>
                  </>
                )}
              </div>
            )}
            {step.assertionFailures && step.assertionFailures.length > 0 && (
              <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] p-2 rounded text-[10px]">
                {step.assertionFailures.map((f, i) => (
                  <p key={i} className="text-[#FCA5A5]">✗ {f}</p>
                ))}
              </div>
            )}
            {step.extractions && Object.keys(step.extractions).length > 0 && (
              <div className="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] p-2 rounded text-[10px]">
                <p className="text-[#34D399] font-semibold mb-1">Extracted Variables</p>
                {Object.entries(step.extractions).map(([key, value]) => (
                  <p key={key} className="text-[#6EE7B7] font-mono">
                    {key}: {value}
                  </p>
                ))}
              </div>
            )}
            {step.error && (
              <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] p-2 rounded text-[10px]">
                <p className="text-[#FCA5A5]">{step.error}</p>
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
