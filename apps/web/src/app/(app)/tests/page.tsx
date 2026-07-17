'use client';

import { useState } from 'react';
import { BenchmarksSuite } from '@/components/tests/BenchmarksSuite';
import { SecuritySuite } from '@/components/tests/SecuritySuite';

type TestSuite = 'benchmarks' | 'regression' | 'fuzzing' | 'security' | 'chaos' | 'idempotency';

const suites: { id: TestSuite; label: string }[] = [
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'regression', label: 'Contracts & Regression' },
  { id: 'fuzzing', label: 'Fuzzing' },
  { id: 'security', label: 'Security' },
  { id: 'chaos', label: 'Chaos' },
  { id: 'idempotency', label: 'Idempotency' },
];

export default function TestsPage() {
  const [activeSuite, setActiveSuite] = useState<TestSuite>('benchmarks');

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Sub-navigation */}
      <div className="flex gap-6 px-6 pt-4 border-b border-border/30 bg-card/50 overflow-x-auto">
        {suites.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSuite(s.id)}
            className={`pb-3 px-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              activeSuite === s.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeSuite === 'benchmarks' && <BenchmarksPlaceholder />}
        {activeSuite === 'security' && <SecurityPlaceholder />}
        {activeSuite !== 'benchmarks' && activeSuite !== 'security' && (
          <ComingSoon suite={suites.find((s) => s.id === activeSuite)!.label} />
        )}
      </div>
    </div>
  );
}

function BenchmarksPlaceholder() {
  return <BenchmarksSuite />;
}

function SecurityPlaceholder() {
  return <SecuritySuite />;
}

function SuiteShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <span className="material-symbols-outlined text-muted-foreground text-5xl block mb-3">checklist</span>
        <h2 className="text-sm font-bold text-foreground mb-1">{title}</h2>
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
        <p className="text-[10px] text-muted-foreground font-mono">Suite {children} — coming next</p>
      </div>
    </div>
  );
}

function ComingSoon({ suite }: { suite: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <span className="material-symbols-outlined text-muted-foreground text-5xl block mb-3">construction</span>
        <h2 className="text-sm font-bold text-foreground mb-1">{suite}</h2>
        <p className="text-xs text-muted-foreground">Coming in M2</p>
      </div>
    </div>
  );
}