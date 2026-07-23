'use client';

import { useActiveDomain } from '@/stores/domainStore';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function AnimatedBackground({ children }: { children: React.ReactNode }) {
  const activeDomain = useActiveDomain();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted ? resolvedTheme === 'light' : false;

  const bgStyle = isLight && activeDomain.lightBg ? {
    backgroundColor: activeDomain.lightBg,
  } : undefined;

  const orbColor = activeDomain.orbColor || 'rgba(99, 102, 241, 0.05)';
  const accentHex = activeDomain.accentColor || '#6338F1';

  return (
    <div 
      className="relative min-h-screen bg-background overflow-hidden transition-colors duration-500 ease-in-out"
      style={bgStyle}
    >
      {/* Mesh gradient */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-500 ease-in-out"
        aria-hidden="true"
        style={{
          background: isLight ? [
            `radial-gradient(circle at 0% 0%, ${orbColor} 0%, transparent 60%)`,
            `radial-gradient(circle at 100% 0%, ${accentHex}15 0%, transparent 50%)`,
            `radial-gradient(circle at 100% 100%, ${orbColor} 0%, transparent 60%)`,
            `radial-gradient(circle at 0% 100%, ${accentHex}10 0%, transparent 50%)`,
          ].join(', ') : [
            'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 100%, rgba(167, 139, 250, 0.02) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      {/* Dot grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle, ${isLight ? accentHex + '18' : 'rgba(99, 102, 241, 0.06)'} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 70%)',
        }}
      />

      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <Orb
          size={280}
          color={isLight ? orbColor : "rgba(99, 102, 241, 0.03)"}
          style={{ top: '5%', left: '10%', animationDelay: '0s', animationDuration: '20s' }}
        />
        <Orb
          size={220}
          color={isLight ? `${accentHex}10` : "rgba(139, 92, 246, 0.03)"}
          style={{ top: '65%', left: '65%', animationDelay: '-4s', animationDuration: '24s' }}
        />
        <Orb
          size={180}
          color={isLight ? orbColor : "rgba(99, 102, 241, 0.035)"}
          style={{ top: '35%', left: '85%', animationDelay: '-8s', animationDuration: '22s' }}
        />
      </div>

      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Orb({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="absolute rounded-full animate-drift"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        filter: 'blur(60px)',
        willChange: 'transform',
        ...style,
      }}
    />
  );
}
