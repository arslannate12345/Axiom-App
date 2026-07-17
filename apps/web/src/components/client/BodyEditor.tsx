'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { BodyType } from '@/lib/api';
import { Button } from '@/components/ui/button';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-full bg-[#0F172A] animate-pulse" /> },
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
                ? 'bg-[#6366F1] text-white'
                : 'bg-transparent border-[#334155] text-[#94A3B8] hover:text-[#e4e1ed]'
            }`}
          >
            {type}
          </Button>
        ))}
        {bodyType === 'json' && (
          <Button
            variant="ghost"
            onClick={handleFormat}
            className="ml-auto h-7 px-3 text-[10px] font-semibold text-[#6366F1] hover:text-[#818CF8]"
          >
            Beautify
          </Button>
        )}
      </div>

      {/* Body = none => show nothing */}
      {bodyType === 'none' ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[#475569]">This request does not have a body</p>
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
                  className="px-3 py-1 bg-[#334155] border border-[#475569] rounded text-xs font-mono text-[#e4e1ed] hover:bg-[#475569] transition-colors shrink-0"
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {/* Monaco editor */}
          <div className="flex-1 min-h-[160px] border border-[#334155] rounded overflow-hidden">
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
