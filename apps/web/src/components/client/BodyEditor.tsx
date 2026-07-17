'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { BodyType } from '@/lib/api';
import { Button } from '@/components/ui/button';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-full bg-background animate-pulse" /> },
);

export interface BodyEditorProps {
  bodyType: BodyType;
  body: string;
  onBodyTypeChange: (type: BodyType) => void;
  onBodyChange: (body: string) => void;
}

const ACCESSORY_KEYS = ['{', '}', '[', ']', '"', ':', ',', '{{', '}}'];

export function BodyEditor({ bodyType, body, onBodyTypeChange, onBodyChange }: BodyEditorProps) {
  const [editorReady, setEditorReady] = useState(false);

  const handleFormat = () => {
    if (bodyType !== 'json' || !body.trim()) return;
    try {
      const stripped = body.replace(/\{\{\s*[\w.-]+\s*\}\}/g, (match) => {
        return `__AX_VAR_${match.replace(/[{}]/g, '').trim()}__`;
      });
      const parsed = JSON.parse(stripped);
      const formatted = JSON.stringify(parsed, null, 2);
      const restored = formatted.replace(/__AX_VAR_([\w.-]+)__/g, (_, name) => `{{${name}}}`);
      onBodyChange(restored);
    } catch {
      // Invalid JSON — ignore format
    }
  };

  const insertAtCursor = (text: string) => {
    onBodyChange(body + text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Type selector + Format button */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        {(['none', 'json', 'raw'] as BodyType[]).map((type) => (
          <Button
            key={type}
            variant={bodyType === type ? 'default' : 'outline'}
            onClick={() => onBodyTypeChange(type)}
            className={`h-7 px-3 text-[10px] font-semibold uppercase tracking-wider ${
              bodyType === type
                ? 'bg-primary text-white'
                : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {type}
          </Button>
        ))}
        {bodyType === 'json' && (
          <Button
            variant="ghost"
            onClick={handleFormat}
            className="ml-auto h-7 px-3 text-[10px] font-semibold text-primary hover:text-primary"
          >
            Beautify
          </Button>
        )}
      </div>

      {/* Body = none => show nothing */}
      {bodyType === 'none' ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">This request does not have a body</p>
        </div>
      ) : (
        <>
          {/* Accessory keys bar */}
          {bodyType === 'json' && (
            <div className="flex gap-1 mb-2 shrink-0 overflow-x-auto">
              {ACCESSORY_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => insertAtCursor(key)}
                  className="px-3 py-1 bg-border border border-border rounded text-xs font-mono text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {/* Monaco editor */}
          <div className="flex-1 min-h-[160px] border border-border rounded overflow-hidden">
            <MonacoEditor
              language={bodyType === 'json' ? 'json' : 'plaintext'}
              value={body}
              onChange={(val) => onBodyChange(val || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
              }}
              onMount={() => setEditorReady(true)}
            />
          </div>
        </>
      )}
    </div>
  );
}