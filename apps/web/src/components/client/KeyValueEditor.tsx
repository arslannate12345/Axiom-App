'use client';

import type { KeyValuePair } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  suggestedKeys?: string[];
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  suggestedKeys,
}: KeyValueEditorProps) {
  const updatePair = (index: number, updates: Partial<KeyValuePair>) => {
    const next = pairs.map((p, i) => (i === index ? { ...p, ...updates } : p));
    onChange(next);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const addPair = (prefillKey?: string) => {
    onChange([...pairs, { key: prefillKey || '', value: '', enabled: true }]);
  };

  return (
    <div className="space-y-2">
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          {/* Toggle */}
          <button
            onClick={() => updatePair(index, { enabled: !pair.enabled })}
            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
              pair.enabled
                ? 'bg-primary border-primary'
                : 'bg-transparent border-border'
            }`}
          >
            {pair.enabled && (
              <span className="text-white text-[10px] font-bold">✓</span>
            )}
          </button>

          {/* Key */}
          <Input
            value={pair.key}
            onChange={(e) => updatePair(index, { key: e.target.value })}
            placeholder={keyPlaceholder}
            className="h-8 bg-card border-border text-foreground text-xs font-mono focus:border-primary flex-1"
          />

          {/* Value */}
          <Input
            value={pair.value}
            onChange={(e) => updatePair(index, { value: e.target.value })}
            placeholder={valuePlaceholder}
            className="h-8 bg-card border-border text-foreground text-xs font-mono focus:border-primary flex-[2]"
          />

          {/* Remove */}
          <button
            onClick={() => removePair(index)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[#EF4444] text-sm">close</span>
          </button>
        </div>
      ))}

      {/* Add button */}
      <Button
        variant="ghost"
        onClick={() => addPair()}
        className="w-full border border-dashed border-border text-primary text-xs h-8 rounded hover:bg-transparent hover:border-primary"
      >
        <span className="material-symbols-outlined text-sm mr-1">add</span>
        Add
      </Button>

      {/* Suggested keys */}
      {suggestedKeys && suggestedKeys.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestedKeys.map((key) => (
            <button
              key={key}
              onClick={() => {
                const exists = pairs.some((p) => p.key === key);
                if (!exists) addPair(key);
              }}
              className="px-3 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              + {key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}