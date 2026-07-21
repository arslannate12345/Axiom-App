'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({ icon = 'inbox', title, description, action, className = '' }: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className={`flex flex-col items-center justify-center flex-1 text-muted-foreground py-16 ${className}`}>
      <span className="material-symbols-outlined text-6xl mb-4 opacity-40" style={{ fontVariationSettings: "'FILL' 0" }}>
        {icon}
      </span>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      {description && <p className="text-xs text-center max-w-xs">{description}</p>}
      {action && (
        <Button
          onClick={() => router.push(action.href)}
          className="mt-4 h-8 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <span className="material-symbols-outlined text-[14px] mr-1">arrow_forward</span>
          {action.label}
        </Button>
      )}
    </div>
  );
}
