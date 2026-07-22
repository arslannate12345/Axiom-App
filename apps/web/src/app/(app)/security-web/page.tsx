'use client';

import { motion } from 'motion/react';

export default function SecurityWebPage() {
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
          style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
        >
          <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield
          </span>
        </motion.div>

        <h1 className="text-2xl font-black text-foreground mb-2">Web Security Testing</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          TLS/certificate validation, security header analysis (CSP, HSTS, X-Frame-Options),
          cookie flag auditing, and exposed path scanning for your web properties.
        </p>

        {/* Security check categories */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: 'lock', label: 'TLS & Certificates' },
            { icon: 'policy', label: 'Security Headers' },
            { icon: 'cookie', label: 'Cookie Flags' },
            { icon: 'folder_off', label: 'Exposed Paths' },
          ].map((check) => (
            <div
              key={check.label}
              className="bg-card border border-border rounded-lg p-3 flex items-center gap-2.5"
            >
              <span className="material-symbols-outlined text-muted-foreground/30 text-xl">{check.icon}</span>
              <span className="text-[12px] text-muted-foreground/60 font-medium">{check.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
            <span className="material-symbols-outlined text-red-500 text-[14px]">construction</span>
            <span className="text-[11px] font-semibold text-red-500">Coming in Phase 4</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
