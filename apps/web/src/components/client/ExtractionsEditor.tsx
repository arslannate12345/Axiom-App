'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Extraction, ExtractionType } from '@/lib/extractions';
import { createExtractionId } from '@/lib/extractions';

const EXTRACTION_TYPES: { value: ExtractionType; label: string }[] = [
  { value: 'jsonPath', label: 'JSON Path' },
  { value: 'header', label: 'Header' },
  { value: 'regex', label: 'Regex' },
];

interface ExtractionsEditorProps {
  extractions: Extraction[];
  onChange: (extractions: Extraction[]) => void;
}

export function ExtractionsEditor({ extractions, onChange }: ExtractionsEditorProps) {
  const handleAdd = () => {
    const newExtraction: Extraction = {
      id: createExtractionId(),
      type: 'jsonPath',
      expression: '',
      variableName: '',
      enabled: true,
    };
    onChange([...extractions, newExtraction]);
  };

  const handleRemove = (id: string) => {
    onChange(extractions.filter((e) => e.id !== id));
  };

  const handleUpdate = (id: string, patch: Partial<Extraction>) => {
    onChange(extractions.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const hasResults = extractions.some((e) => e.value !== undefined || e.error !== undefined);
  const successCount = extractions.filter((e) => e.enabled && e.value !== undefined && !e.error).length;
  const errorCount = extractions.filter((e) => e.enabled && e.error).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground font-medium">
            {extractions.length} extraction{extractions.length !== 1 ? 's' : ''}
          </span>
          {hasResults && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-[#10B981] font-mono">✓ {successCount}</span>
              {errorCount > 0 && <span className="text-[#EF4444] font-mono">✗ {errorCount}</span>}
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
        {extractions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <span className="material-symbols-outlined text-2xl mb-2">data_object</span>
            <p className="text-[12px]">No extractions defined</p>
            <p className="text-[12px] mt-0.5">Extract values from responses into variables</p>
          </div>
        ) : (
          extractions.map((e) => (
            <ExtractionRow
              key={e.id}
              extraction={e}
              onUpdate={(patch) => handleUpdate(e.id, patch)}
              onRemove={() => handleRemove(e.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ExtractionRow({
  extraction,
  onUpdate,
  onRemove,
}: {
  extraction: Extraction;
  onUpdate: (patch: Partial<Extraction>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 group">
      {/* Result indicator */}
      <span className="w-4 text-center shrink-0">
        {extraction.value !== undefined && !extraction.error && (
          <span className="material-symbols-outlined text-[14px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        )}
        {extraction.error && (
          <span className="material-symbols-outlined text-[14px] text-[#EF4444]">cancel</span>
        )}
        {extraction.value === undefined && !extraction.error && extraction.enabled && (
          <span className="material-symbols-outlined text-[12px] text-muted-foreground/40">circle</span>
        )}
      </span>

      {/* Type select */}
      <select
        value={extraction.type}
        onChange={(e) => onUpdate({ type: e.target.value as ExtractionType })}
        className="h-7 px-1.5 rounded bg-background border border-border text-[12px] text-foreground font-medium outline-none focus:border-primary shrink-0 w-[85px]"
      >
        {EXTRACTION_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Expression */}
      <Input
        value={extraction.expression}
        onChange={(e) => onUpdate({ expression: e.target.value })}
        placeholder={
          extraction.type === 'jsonPath'
            ? '$.data.token'
            : extraction.type === 'header'
              ? 'Authorization'
              : 'Bearer (.+)'
        }
        className="h-7 bg-background border-border text-[12px] font-mono text-foreground px-2 flex-1 min-w-[120px]"
      />

      {/* Variable name */}
      <Input
        value={extraction.variableName}
        onChange={(e) => onUpdate({ variableName: e.target.value })}
        placeholder="var_name"
        className="h-7 bg-background border-border text-[12px] font-mono text-foreground px-2 w-[100px] shrink-0"
      />

      {/* Result value */}
      {extraction.value !== undefined && (
        <span
          className="text-[12px] font-mono shrink-0 max-w-[120px] truncate px-1.5 py-0.5 rounded bg-[#10B981]/10 text-[#10B981]"
          title={extraction.value}
        >
          {extraction.value.slice(0, 30)}
        </span>
      )}

      {/* Error */}
      {extraction.error && (
        <span className="text-[12px] text-[#EF4444] shrink-0 max-w-[100px] truncate" title={extraction.error}>
          {extraction.error}
        </span>
      )}

      {/* Toggle enabled */}
      <button
        onClick={() => onUpdate({ enabled: !extraction.enabled })}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title={extraction.enabled ? 'Disable' : 'Enable'}
      >
        <span className={`material-symbols-outlined text-[14px] ${extraction.enabled ? 'text-foreground' : 'text-muted-foreground/40'}`}>
          {extraction.enabled ? 'toggle_on' : 'toggle_off'}
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
