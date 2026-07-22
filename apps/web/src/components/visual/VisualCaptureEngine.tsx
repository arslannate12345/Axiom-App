'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useVisualStore } from '@/stores/visualStore';
import { DEFAULT_VIEWPORTS } from '@/lib/visual-service';
import type { ViewportDevice } from '@axiom/core/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function VisualCaptureEngine() {
  const {
    targetUrl,
    setTargetUrl,
    selectedViewports,
    toggleViewport,
    isCapturing,
    activeSession,
    error,
    startCapture,
  } = useVisualStore();

  const [inputUrl, setInputUrl] = useState(targetUrl || 'https://example.com');
  const [activeFrameTab, setActiveFrameTab] = useState<ViewportDevice>('desktop');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setTargetUrl(inputUrl);
    startCapture(inputUrl);
  };

  const currentViewport = DEFAULT_VIEWPORTS.find((vp) => vp.id === activeFrameTab) || DEFAULT_VIEWPORTS[3];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header & Controls */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-purple-500 text-2xl">devices</span>
            <h1 className="text-2xl font-black text-foreground">Visual & Responsive Testing</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Capture responsive layout snapshots across multiple viewports and inspect live device frames.
          </p>
        </div>

        {/* Input & Viewport Toggle Bar */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]">
                language
              </span>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={isCapturing}
              className="h-11 px-6 rounded-xl font-bold text-white shadow-lg transition-all duration-200 hover:shadow-purple-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}
            >
              {isCapturing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                  <span>Capturing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  <span>Run Capture</span>
                </>
              )}
            </button>
          </div>

          {/* Viewport Selectors */}
          <div className="flex items-center gap-2 flex-wrap bg-card border border-border rounded-xl p-3">
            <span className="text-xs font-bold text-muted-foreground mr-2">Target Viewports:</span>
            {DEFAULT_VIEWPORTS.map((vp) => {
              const isSelected = selectedViewports.some((item) => item.id === vp.id);
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => toggleViewport(vp)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all duration-150',
                    isSelected
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-500 font-bold'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  <span className="material-symbols-outlined text-[16px]">{vp.icon}</span>
                  <span>{vp.label} ({vp.width}px)</span>
                </button>
              );
            })}
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        {/* Live Device Frame Previewer */}
        <div className="border border-border rounded-xl bg-card overflow-hidden space-y-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-muted-foreground">preview</span>
              <h2 className="text-sm font-bold text-foreground">Responsive Viewport Inspection</h2>
            </div>

            {/* Viewport Tab Switches */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
              {DEFAULT_VIEWPORTS.map((vp) => (
                <button
                  key={vp.id}
                  onClick={() => setActiveFrameTab(vp.id)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors',
                    activeFrameTab === vp.id
                      ? 'bg-purple-500 text-white font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="material-symbols-outlined text-[14px]">{vp.icon}</span>
                  <span className="hidden sm:inline">{vp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Frame Box */}
          <div className="p-6 bg-zinc-950/80 flex flex-col items-center justify-center min-h-[480px] overflow-x-auto">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-3 font-mono">
              <span>Resolution: {currentViewport.width}px × {currentViewport.height}px</span>
              <span>•</span>
              <span className="uppercase text-purple-400 font-bold">{currentViewport.id}</span>
            </div>

            {/* Device Container Wrapper */}
            <motion.div
              key={currentViewport.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="border-4 border-zinc-700 rounded-xl overflow-hidden shadow-2xl bg-white transition-all duration-300"
              style={{
                width: Math.min(currentViewport.width, 1024),
                height: 440,
              }}
            >
              <iframe
                src={inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`}
                title="Responsive Viewport Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
              />
            </motion.div>
          </div>
        </div>

        {/* Capture Results Stats */}
        {activeSession && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Visual Session Summary</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Overall Layout Match: {activeSession.overallMatchScore}%</p>
              </div>
              <Link
                href="/visual/diffs"
                className="px-4 py-2 rounded-lg bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow hover:bg-purple-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">compare</span>
                <span>Open Visual Diffs</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {activeSession.snapshots.map((snap) => (
                <div key={snap.id} className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{snap.viewport.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500">
                      CAPTURED
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground">{snap.viewport.width} × {snap.viewport.height}px</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
