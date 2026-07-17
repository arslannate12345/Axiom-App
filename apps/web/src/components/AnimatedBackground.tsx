'use client';

export function AnimatedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0F172A] overflow-hidden">
      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <Orb
          size={160}
          color="rgba(99, 102, 241, 0.06)"
          style={{
            top: '10%',
            left: '15%',
            animationDelay: '0s',
            animationDuration: '14s',
          }}
        />
        <Orb
          size={120}
          color="rgba(139, 92, 246, 0.05)"
          style={{
            top: '60%',
            left: '70%',
            animationDelay: '-3s',
            animationDuration: '18s',
          }}
        />
        <Orb
          size={200}
          color="rgba(167, 139, 250, 0.04)"
          style={{
            top: '30%',
            left: '80%',
            animationDelay: '-6s',
            animationDuration: '16s',
          }}
        />
        <Orb
          size={90}
          color="rgba(99, 102, 241, 0.07)"
          style={{
            top: '75%',
            left: '25%',
            animationDelay: '-9s',
            animationDuration: '20s',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
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
        filter: 'blur(40px)',
        willChange: 'transform',
        ...style,
      }}
    />
  );
}
