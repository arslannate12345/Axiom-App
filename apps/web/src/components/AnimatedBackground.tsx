'use client';

export function AnimatedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Mesh gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: [
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
          backgroundImage: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 40%, transparent 70%)',
        }}
      />

      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <Orb
          size={280}
          color="rgba(99, 102, 241, 0.03)"
          style={{ top: '5%', left: '10%', animationDelay: '0s', animationDuration: '20s' }}
        />
        <Orb
          size={220}
          color="rgba(139, 92, 246, 0.03)"
          style={{ top: '65%', left: '65%', animationDelay: '-4s', animationDuration: '24s' }}
        />
        <Orb
          size={180}
          color="rgba(99, 102, 241, 0.035)"
          style={{ top: '35%', left: '85%', animationDelay: '-8s', animationDuration: '22s' }}
        />
      </div>

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
