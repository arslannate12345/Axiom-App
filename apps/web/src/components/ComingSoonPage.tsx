'use client';

import { motion } from 'motion/react';
import { useActiveDomain } from '@/stores/domainStore';

export function ComingSoonPage({ title, description }: { title: string, description: string }) {
  const activeDomain = useActiveDomain();
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg"
          style={{ background: activeDomain.gradient }}
        >
          <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {activeDomain.icon}
          </span>
        </motion.div>

        <h1 className="text-2xl font-black text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center gap-2 justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${activeDomain.accentColor}20`, border: `1px solid ${activeDomain.accentColor}40` }}>
            <span className="material-symbols-outlined text-[14px]" style={{ color: activeDomain.accentColor }}>construction</span>
            <span className="text-[11px] font-semibold" style={{ color: activeDomain.accentColor }}>Coming Soon</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
