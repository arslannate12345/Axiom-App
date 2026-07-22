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
  const getColor = (s: number | null) => {
    if (s === null) return 'text-muted-foreground bg-muted border-border';
    if (s >= 90) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (s >= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const getRingColor = (s: number | null) => {
    if (s === null) return 'text-border';
    if (s >= 90) return 'text-emerald-500';
    if (s >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const colors = getColor(score);
  const ringColor = getRingColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border',
        colors,
        size === 'lg' ? 'p-6' : 'p-3'
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* SVG Circle for the score */}
        <svg
          className="transform -rotate-90"
          width={size === 'lg' ? 100 : 60}
          height={size === 'lg' ? 100 : 60}
        >
          <circle
            cx={size === 'lg' ? 50 : 30}
            cy={size === 'lg' ? 50 : 30}
            r={size === 'lg' ? 45 : 27}
            stroke="currentColor"
            strokeWidth={size === 'lg' ? 8 : 4}
            fill="transparent"
            className="text-muted/30"
          />
          {score !== null && (
            <motion.circle
              cx={size === 'lg' ? 50 : 30}
              cy={size === 'lg' ? 50 : 30}
              r={size === 'lg' ? 45 : 27}
              stroke="currentColor"
              strokeWidth={size === 'lg' ? 8 : 4}
              fill="transparent"
              className={ringColor}
              strokeDasharray={size === 'lg' ? 2 * Math.PI * 45 : 2 * Math.PI * 27}
              initial={{ strokeDashoffset: size === 'lg' ? 2 * Math.PI * 45 : 2 * Math.PI * 27 }}
              animate={{ strokeDashoffset: (size === 'lg' ? 2 * Math.PI * 45 : 2 * Math.PI * 27) * (1 - score / 100) }}
              transition={{ duration: 1.5, delay: delay + 0.2, ease: 'easeOut' }}
            />
          )}
        </svg>
        <span className={cn(
          "absolute font-black",
          size === 'lg' ? "text-3xl" : "text-xl",
          ringColor
        )}>
          {score !== null ? score : '-'}
        </span>
      </div>
      <p className={cn(
        "font-bold uppercase tracking-widest mt-4 text-center",
        size === 'lg' ? "text-[12px]" : "text-[10px]",
        ringColor
      )}>
        {label}
      </p>
    </motion.div>
  );
}
