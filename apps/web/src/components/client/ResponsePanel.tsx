'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ResponseTiming } from '@/lib/api';
import { getStatusColor, getStatusLabel, formatBytes, formatMs } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-full bg-[#0F172A] animate-pulse" /> },
);

export interface ResponsePanelProps {
  response: ResponseTiming | null;
  error: string | null;
  isLoading: boolean;
}

export function ResponsePanel({ response, error, isLoading }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState('body');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#94A3B8]">Waiting for response...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Badge className="bg-[#EF4444] text-white px-3 py-1 mb-3 text-xs font-bold">Error</Badge>
          <p className="text-xs text-[#FCA5A5] max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined text-[#334155] text-4xl block mb-2">api</span>
          <p className="text-xs text-[#475569]">Send a request to see the response</p>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(response.status);
  const statusLabel = getStatusLabel(response.status);

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#1b1b23] border-b border-[#334155] shrink-0">
        <div className="flex items-center gap-2">
          <Badge
            className="text-white text-[11px] font-bold px-3 py-1 rounded"
            style={{ backgroundColor: statusColor }}
          >
            {response.status} {response.statusText}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[#64748B]">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span className="text-[11px] font-mono">{formatMs(response.totalTime)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#64748B]">
          <span className="material-symbols-outlined text-[14px]">database</span>
          <span className="text-[11px] font-mono">{formatBytes(response.size)}</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(response.body)}
            className="text-[#64748B] hover:text-[#e4e1ed] transition-colors"
            title="Copy response body"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
          </button>
          <button
            onClick={() => {
              const blob = new Blob([response.body], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `response-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-[#64748B] hover:text-[#e4e1ed] transition-colors"
            title="Download response"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex border-b border-[#334155] px-4 shrink-0 h-9">
          <button
            onClick={() => setActiveTab('body')}
            className={`text-xs px-3 h-full flex items-center transition-colors ${
              activeTab === 'body'
                ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                : 'text-[#94A3B8] hover:text-[#e4e1ed]'
            }`}
          >
            Body
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`text-xs px-3 h-full flex items-center transition-colors ${
              activeTab === 'headers'
                ? 'text-[#6366F1] border-b-2 border-[#6366F1]'
                : 'text-[#94A3B8] hover:text-[#e4e1ed]'
            }`}
          >
            Headers
          </button>
        </div>

        {/* Body tab */}
        {activeTab === 'body' && (
          <div className="flex-1 min-h-0">
            <div className="w-full h-full">
              {(() => {
                try {
                  const parsed = JSON.parse(response.body);
                  return (
                    <MonacoEditor
                      language="json"
                      value={JSON.stringify(parsed, null, 2)}
                      theme="vs-dark"
                      height="100%"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono, monospace',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        padding: { top: 8, bottom: 8 },
                      }}
                    />
                  );
                } catch {
                  return (
                    <MonacoEditor
                      language="plaintext"
                      value={response.body}
                      theme="vs-dark"
                      height="100%"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono, monospace',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        padding: { top: 8, bottom: 8 },
                      }}
                    />
                  );
                }
              })()}
            </div>
          </div>
        )}

        {/* Headers tab */}
        {activeTab === 'headers' && (
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <div className="space-y-1">
              {Object.entries(response.headers).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between py-1.5 px-2 rounded text-[11px] hover:bg-[#1E293B] transition-colors"
                >
                  <span className="text-[#93C5FD] font-mono font-medium">{key}</span>
                  <span className="text-[#94A3B8] font-mono ml-4 text-right break-all max-w-[60%]">
                    {value}
                  </span>
                </div>
              ))}
              {Object.keys(response.headers).length === 0 && (
                <p className="text-xs text-[#475569] text-center py-8">No response headers</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
