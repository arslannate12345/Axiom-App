'use client';

import { useState } from 'react';
import { BenchmarksSuite } from '@/components/tests/BenchmarksSuite';
import { SecuritySuite } from '@/components/tests/SecuritySuite';
import { FuzzSuite } from '@/components/tests/FuzzSuite';
import { ChaosSuite } from '@/components/tests/ChaosSuite';
import { IdempotencySuite } from '@/components/tests/IdempotencySuite';
import { RegressionSuite } from '@/components/tests/RegressionSuite';

type TestSuite = 'benchmarks' | 'regression' | 'fuzzing' | 'security' | 'chaos' | 'idempotency';

const suits: { id: TestSuite; label: string }[] = [
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'regression', label: 'Contracts & Regression' },
  { id: 'fuzzing', label: 'Fuzzing' },
  { id: 'idempotency', label: 'Idempotency' },
  { id: 'security', label: 'Security' },
  { id: 'chaos', label: 'Chaos' },
];

export default function TestsPage() {
  const [active, setActive] = useState<TestSuite>('benchmarks');

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex gap-6 px-6 pt-4 border-b border-border/30 bg-card/50 overflow-x-auto shrink-0">
        {suits.map((s) => (
          <button key={s.id} onClick={() => active !== s.id && setActive(s.id)}
            className={`pb-3 px-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${
              active === s.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >{s.label}</button>
        ))}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {active === 'benchmarks' && <BenchmarksSuite />}
        {active === 'regression' && <RegressionSuite />}
        {active === 'fuzzing' && <FuzzSuite />}
        {active === 'security' && <SecuritySuite />}
        {active === 'chaos' && <ChaosSuite />}
        {active === 'idempotency' && <IdempotencySuite />}
      </div>
    </div>
  );
}
