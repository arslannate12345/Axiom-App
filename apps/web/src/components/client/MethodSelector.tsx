'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: '#10B981',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  PATCH: '#8B5CF6',
  DELETE: '#EF4444',
  HEAD: '#64748B',
  OPTIONS: '#EC4899',
};

export interface MethodSelectorProps {
  method: string;
  onSelect: (method: string) => void;
}

export function MethodSelector({ method, onSelect }: MethodSelectorProps) {
  const color = METHOD_COLORS[method] || '#64748B';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="px-4 py-2 bg-[#292932] text-xs font-bold border-r border-[#334155] hover:bg-[#34343d] transition-colors outline-none min-w-[80px] text-center"
          style={{ color }}
        >
          {method}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[#1E293B] border-[#334155] min-w-[160px]">
        <div className="px-3 py-2 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider text-center">
          HTTP Method
        </div>
        {METHODS.map((m) => (
          <DropdownMenuItem
            key={m}
            onClick={() => onSelect(m)}
            className={`text-xs font-bold cursor-pointer hover:bg-[#34343d] ${
              m === method ? 'bg-[#334155] text-[#e4e1ed]' : ''
            }`}
            style={{ color: m === method ? '#e4e1ed' : METHOD_COLORS[m] }}
          >
            {m}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { METHOD_COLORS };
