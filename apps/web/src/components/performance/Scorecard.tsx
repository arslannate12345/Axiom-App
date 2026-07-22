'use client';

import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface ScorecardProps {
  label: string;
  score: number | null;
  size?: 'sm' | 'lg';
  delay?: number;
}

export function Scorecard({ label, score, size = 'lg', delay = 0 }: ScorecardProps) {
  // Determine color based on lighthouse thresholds
  const getColorStyle = (s: number | null) => {
    if (s === null) {
      return {
        text: 'text-muted-foreground',
        glow: '',
        stroke: '#64748B',
        bg: 'bg-slate-900/60 border-white/10',
      };
    }
    if (s >= 90) {
      return {
        text: 'text-emerald-400',
        glow: 'shadow-[0_0_25px_-5px_rgba(16,185,129,0.35)] border-emerald-500/30',
        stroke: '#10B981',
        bg: 'bg-emerald-950/20',
      };
    }
    if (s >= 50) {
      return {
        text: 'text-amber-400',
        glow: 'shadow-[0_0_25px_-5px_rgba(245,158,11,0.35)] border-amber-500/30',
        stroke: '#F59E0B',
        bg: 'bg-amber-950/20',
      };
    }
    return {
      text: 'text-red-400',
      glow: 'shadow-[0_0_25px_-5px_rgba(239,68,68,0.35)] border-red-500/30',
      stroke: '#EF4444',
      bg: 'bg-red-950/20',
    };
  };

  const style = getColorStyle(score);
  const radius = size === 'lg' ? 44 : 26;
  const strokeWidth = size === 'lg' ? 7 : 4;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border backdrop-blur-xl transition-all duration-300',
        style.bg,
        style.glow,
        size === 'lg' ? 'p-5' : 'p-3'
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* SVG Circle for the score */}
        <svg
          className="transform -rotate-90"
          width={size === 'lg' ? 104 : 64}
          height={size === 'lg' ? 104 : 64}
        >
          {/* Background Track */}
          <circle
            cx={size === 'lg' ? 52 : 32}
            cy={size === 'lg' ? 52 : 32}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Ring */}
          {score !== null && (
            <motion.circle
              cx={size === 'lg' ? 52 : 32}
              cy={size === 'lg' ? 52 : 32}
              r={radius}
              stroke={style.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
              transition={{ duration: 1.4, delay: delay + 0.1, ease: 'easeOut' }}
            />
          )}
        </svg>

        {/* Center Score Number */}
        <span className={cn(
          "absolute font-black tracking-tight",
          size === 'lg' ? "text-3xl" : "text-xl",
          style.text
        )}>
          {score !== null ? score : '-'}
        </span>
      </div>

      <p className={cn(
        "font-extrabold uppercase tracking-widest mt-3 text-center",
        size === 'lg' ? "text-[11px]" : "text-[10px]",
        style.text
      )}>
        {label}
      </p>
    </motion.div>
  );
}
