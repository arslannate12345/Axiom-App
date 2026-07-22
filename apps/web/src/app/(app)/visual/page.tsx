'use client';

import { motion } from 'motion/react';

export default function VisualTestingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center max-w-lg"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}
        >
          <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            devices
          </span>
        </motion.div>

        <h1 className="text-2xl font-black text-foreground mb-2">Visual & Responsive Testing</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Capture screenshots at multiple viewport breakpoints and detect visual regressions
          between runs with pixel-level diff analysis.
        </p>

        {/* Breakpoint preview */}
        <div className="flex items-end gap-3 justify-center mb-8">
          {[
            { icon: 'phone_android', label: 'Mobile', w: 'w-10', h: 'h-16' },
            { icon: 'tablet', label: 'Tablet', w: 'w-14', h: 'h-18' },
            { icon: 'computer', label: 'Desktop', w: 'w-20', h: 'h-14' },
            { icon: 'monitor', label: 'Wide', w: 'w-24', h: 'h-14' },
          ].map((bp) => (
            <div key={bp.label} className="flex flex-col items-center gap-1.5">
              <div className={`${bp.w} ${bp.h} bg-card border border-border rounded-md flex items-center justify-center`}>
                <span className="material-symbols-outlined text-muted-foreground/20 text-lg">{bp.icon}</span>
              </div>
              <span className="text-[9px] text-muted-foreground/50 uppercase font-bold tracking-wider">{bp.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            <span className="material-symbols-outlined text-purple-500 text-[14px]">construction</span>
            <span className="text-[11px] font-semibold text-purple-500">Coming in Phase 5</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
