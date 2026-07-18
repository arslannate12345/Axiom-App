'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Assertion, AssertionType, AssertionOperator } from '@/lib/assertions';
import { createAssertionId, getOperatorLabel } from '@/lib/assertions';

const ASSERTION_TYPES: { value: AssertionType; label: string }[] = [
  { value: 'status', label: 'Status Code' },
  { value: 'body', label: 'Body' },
  { value: 'header', label: 'Header' },
  { value: 'jsonPath', label: 'JSON Path' },
  { value: 'responseTime', label: 'Response Time' },
];

function getOperators(type: AssertionType): { value: AssertionOperator; label: string }[] {
  switch (type) {
    case 'status':
      return [
        { value: 'equals', label: '=' },
        { value: 'notEquals', label: '≠' },
      ];
    case 'body':
      return [
        { value: 'contains', label: 'contains' },
        { value: 'notContains', label: '!contains' },
        { value: 'equals', label: 'equals' },
      ];
    case 'header':
      return [
        { value: 'exists', label: 'exists' },
        { value: 'equals', label: '=' },
        { value: 'contains', label: 'contains' },
      ];
    case 'jsonPath':
      return [
        { value: 'exists', label: 'exists' },
        { value: 'equals', label: '=' },
        { value: 'notEquals', label: '≠' },
        { value: 'contains', label: 'contains' },
        { value: 'greaterThan', label: '>' },
        { value: 'lessThan', label: '<' },
      ];
    case 'responseTime':
      return [
        { value: 'lessThan', label: '<' },
        { value: 'greaterThan', label: '>' },
      ];
    default:
      return [];
  }
}

interface AssertionsEditorProps {
  assertions: Assertion[];
  onChange: (assertions: Assertion[]) => void;
  onRun: () => void;
}

export function AssertionsEditor({ assertions, onChange, onRun }: AssertionsEditorProps) {
  const handleAdd = () => {
    const newAssertion: Assertion = {
      id: createAssertionId(),
      type: 'status',
      target: '',
      operator: 'equals',
      expected: '200',
      enabled: true,
    };
    onChange([...assertions, newAssertion]);
  };

  const handleRemove = (id: string) => {
    onChange(assertions.filter((a) => a.id !== id));
  };

  const handleUpdate = (id: string, patch: Partial<Assertion>) => {
    onChange(assertions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const enabledCount = assertions.filter((a) => a.enabled).length;
  const passedCount = assertions.filter((a) => a.enabled && a.result === true).length;
  const failedCount = assertions.filter((a) => a.enabled && a.result === false).length;
  const hasResults = assertions.some((a) => a.result !== undefined);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onRun}
            className="h-7 text-[12px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={enabledCount === 0}
          >
            <span className="material-symbols-outlined text-[14px] mr-1">play_arrow</span>
            Run ({enabledCount})
          </Button>
          {hasResults && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-[#10B981] font-mono">✓ {passedCount}</span>
              {failedCount > 0 && <span className="text-[#EF4444] font-mono">✗ {failedCount}</span>}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAdd}
          className="h-7 text-[12px] font-semibold text-primary hover:bg-primary/10"
        >
          <span className="material-symbols-outlined text-[14px] mr-1">add</span>
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-auto min-h-0 space-y-1">
        {assertions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <span className="material-symbols-outlined text-2xl mb-2">checklist</span>
            <p className="text-[12px]">No assertions defined</p>
            <p className="text-[12px] mt-0.5">Add assertions to validate responses</p>
          </div>
        ) : (
          assertions.map((a) => (
            <AssertionRow
              key={a.id}
              assertion={a}
              onUpdate={(patch) => handleUpdate(a.id, patch)}
              onRemove={() => handleRemove(a.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AssertionRow({
  assertion,
  onUpdate,
  onRemove,
}: {
  assertion: Assertion;
  onUpdate: (patch: Partial<Assertion>) => void;
  onRemove: () => void;
}) {
  const operators = getOperators(assertion.type);
  const needsTarget = assertion.type === 'header' || assertion.type === 'jsonPath';
  const needsExpected = assertion.operator !== 'exists';

  return (
    <div className="flex items-center gap-1.5 group">
      {/* Result indicator */}
      <span className="w-4 text-center shrink-0">
        {assertion.result === true && (
          <span className="material-symbols-outlined text-[14px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        )}
        {assertion.result === false && (
          <span className="material-symbols-outlined text-[14px] text-[#EF4444]">cancel</span>
        )}
        {assertion.result === undefined && assertion.enabled && (
          <span className="material-symbols-outlined text-[12px] text-muted-foreground/40">circle</span>
        )}
      </span>

      {/* Type select */}
      <select
        value={assertion.type}
        onChange={(e) => {
          const type = e.target.value as AssertionType;
          const ops = getOperators(type);
          onUpdate({
            type,
            operator: ops[0].value,
            target: type === 'status' ? '' : assertion.target,
            expected: type === 'responseTime' ? '500' : assertion.expected,
          });
        }}
        className="h-7 px-1.5 rounded bg-background border border-border text-[12px] text-foreground font-medium outline-none focus:border-primary shrink-0 w-[100px]"
      >
        {ASSERTION_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Target (for header/jsonPath) */}
      {needsTarget && (
        <Input
          value={assertion.target}
          onChange={(e) => onUpdate({ target: e.target.value })}
          placeholder={assertion.type === 'header' ? 'Header name' : '$.path'}
          className="h-7 bg-background border-border text-[12px] font-mono text-foreground px-2 w-[120px] shrink-0"
        />
      )}

      {/* Operator select */}
      <select
        value={assertion.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as AssertionOperator })}
        className="h-7 px-1 rounded bg-background border border-border text-[12px] text-foreground font-mono outline-none focus:border-primary shrink-0 w-[70px]"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Expected value */}
      {needsExpected && (
        <Input
          value={assertion.expected}
          onChange={(e) => onUpdate({ expected: e.target.value })}
          placeholder="Expected"
          className="h-7 bg-background border-border text-[12px] font-mono text-foreground px-2 flex-1 min-w-[80px]"
        />
      )}

      {/* Actual value (after run) */}
      {assertion.actual !== undefined && (
        <span
          className={`text-[12px] font-mono shrink-0 max-w-[100px] truncate px-1.5 py-0.5 rounded ${
            assertion.result
              ? 'bg-[#10B981]/10 text-[#10B981]'
              : 'bg-[#EF4444]/10 text-[#EF4444]'
          }`}
          title={assertion.actual}
        >
          {assertion.actual.slice(0, 40)}
        </span>
      )}

      {/* Error */}
      {assertion.error && (
        <span className="text-[12px] text-[#EF4444] shrink-0 max-w-[120px] truncate" title={assertion.error}>
          {assertion.error}
        </span>
      )}

      {/* Toggle enabled */}
      <button
        onClick={() => onUpdate({ enabled: !assertion.enabled })}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title={assertion.enabled ? 'Disable' : 'Enable'}
      >
        <span className={`material-symbols-outlined text-[14px] ${assertion.enabled ? 'text-foreground' : 'text-muted-foreground/40'}`}>
          {assertion.enabled ? 'toggle_on' : 'toggle_off'}
        </span>
      </button>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-[#EF4444]"
        title="Remove"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </div>
  );
}
