'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { DEFAULT_VIEWPORTS } from '@/lib/visual-service';
import type { ViewportDevice } from '@axiom/core/types';
import { cn } from '@/lib/utils';

export function VisualDiffEngine() {
  const [activeViewport, setActiveViewport] = useState<ViewportDevice>('desktop');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  const currentVp = DEFAULT_VIEWPORTS.find((v) => v.id === activeViewport) || DEFAULT_VIEWPORTS[3];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  compare
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Visual Regression Diffs Engine</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Detect pixel-level layout shifts and visual regressions between baseline reference and latest builds.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setViewMode('slider')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all duration-150',
                viewMode === 'slider' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="material-symbols-outlined text-[16px]">split_scene</span>
              <span>Slider Overlay</span>
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all duration-150',
                viewMode === 'side-by-side' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="material-symbols-outlined text-[16px]">view_column</span>
              <span>Side by Side</span>
            </button>
          </div>
        </div>

        {/* Viewport Selectors */}
        <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-xl">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mr-2">Viewport:</span>
          {DEFAULT_VIEWPORTS.map((vp) => (
            <button
              key={vp.id}
              onClick={() => setActiveViewport(vp.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all duration-150',
                activeViewport === vp.id
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
              )}
            >
              <span className="material-symbols-outlined text-[16px]">{vp.icon}</span>
              <span>{vp.label}</span>
            </button>
          ))}
        </div>

        {/* Match Metric Gauge */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Match Score</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">99.2%</p>
            </div>
            <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Pixel Mismatch</p>
              <p className="text-3xl font-black text-purple-400 mt-1">0.8%</p>
            </div>
            <span className="material-symbols-outlined text-purple-400 text-3xl">grain</span>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Status</p>
              <p className="text-base font-extrabold text-emerald-400 mt-1">PASS (In Tolerance)</p>
            </div>
            <span className="material-symbols-outlined text-emerald-400 text-3xl">verified</span>
          </div>
        </div>

        {/* Diff Canvas / Comparison Workspace */}
        <div className="border border-white/10 rounded-2xl bg-slate-900/70 backdrop-blur-xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold tracking-wide text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400">compare</span>
            Visual Diff Workspace ({currentVp.width}px × {currentVp.height}px)
          </h3>

          {viewMode === 'slider' ? (
            /* Interactive Slider View */
            <div className="relative w-full h-[460px] bg-zinc-950 rounded-2xl overflow-hidden border-2 border-purple-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(139,92,246,0.25)]">
              {/* Baseline Image Layer */}
              <div
                className="absolute inset-0 bg-cover bg-center flex items-center justify-center text-zinc-500 font-mono text-xs select-none"
                style={{
                  background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
                }}
              >
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl mb-2 text-zinc-600">desktop_windows</span>
                  <p className="font-extrabold text-zinc-300">Baseline Capture (Reference Run)</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Version v1.2.0 • Clean Render</p>
                </div>
              </div>

              {/* Current Build Image Layer (Clipped by Slider) */}
              <div
                className="absolute inset-0 bg-cover bg-center overflow-hidden border-r-2 border-purple-400 flex items-center justify-center text-zinc-400 font-mono text-xs select-none shadow-2xl"
                style={{
                  width: `${sliderPosition}%`,
                  background: 'linear-gradient(135deg, #09090b 0%, #2e1065 100%)',
                }}
              >
                <div className="text-center whitespace-nowrap">
                  <span className="material-symbols-outlined text-4xl mb-2 text-purple-400">devices</span>
                  <p className="font-extrabold text-purple-200">Current Build Capture (Latest Run)</p>
                  <p className="text-[11px] text-purple-300/80 mt-1">Version v1.3.0 • Latest Commit</p>
                </div>
              </div>

              {/* Slider Input Handle */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />

              {/* Visual Divider Bar */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-purple-400 pointer-events-none z-10 flex items-center justify-center shadow-[0_0_15px_#a855f7]"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg border-2 border-zinc-950">
                  <span className="material-symbols-outlined text-[16px]">unfold_more</span>
                </div>
              </div>
            </div>
          ) : (
            /* Side-by-Side View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-white/10 rounded-2xl bg-zinc-950 p-6 h-[380px] flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2">history</span>
                <p className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">Baseline Reference</p>
                <p className="text-[11px] text-zinc-500 mt-1">Rendered at {currentVp.width}px</p>
              </div>

              <div className="border border-purple-500/40 rounded-2xl bg-zinc-950 p-6 h-[380px] flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(139,92,246,0.2)]">
                <span className="material-symbols-outlined text-4xl text-purple-400 mb-2">photo_camera</span>
                <p className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">Current Build</p>
                <p className="text-[11px] text-purple-400/80 mt-1">Rendered at {currentVp.width}px</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
