'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const navItems = [
  { href: '/client', label: 'Client', icon: 'api' },
  { href: '/collections', label: 'Collections', icon: 'folder_open' },
  { href: '/environments', label: 'Environments', icon: 'settings_input_component' },
  { href: '/tests', label: 'Tests', icon: 'checklist' },
  { href: '/history', label: 'History', icon: 'history' },
] as const;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { supabase, session } = useSupabase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleNewRequest = () => {
    router.push('/client');
  };

  return (
    <div className="flex h-screen bg-[#0F172A]">
      {/* SideNav */}
      <aside className="w-[260px] shrink-0 bg-[#1f1f27] border-r border-[#334155] flex flex-col z-50">
        {/* Brand */}
        <div className="px-6 py-4 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6366F1] rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#e4e1ed]">Axiom</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">V1.2.0-stable</p>
            </div>
          </div>
        </div>

        {/* New Request Button */}
        <div className="px-4 py-3">
          <Button
            onClick={handleNewRequest}
            className="w-full h-9 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[11px] font-semibold rounded"
          >
            <span className="material-symbols-outlined text-[18px] mr-1">add</span>
            New Request
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#2f3aa3]/50 text-[#a8afff] font-medium border-r-2 border-[#6366F1]'
                    : 'text-[#c7c4d7] hover:text-[#e4e1ed] hover:bg-[#34343d]/50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#334155] space-y-1">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-colors duration-150 ${
              pathname === '/settings'
                ? 'bg-[#2f3aa3]/50 text-[#a8afff] font-medium border-r-2 border-[#6366F1]'
                : 'text-[#c7c4d7] hover:text-[#e4e1ed] hover:bg-[#34343d]/50'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 text-[#c7c4d7] text-xs cursor-pointer hover:text-[#e4e1ed] hover:bg-[#34343d]/50 rounded-md transition-colors">
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
            Support
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-[#34343d] border border-[#334155] flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-[#c7c4d7] text-lg">person</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-[#e4e1ed] truncate">
                {session?.user?.email?.split('@')[0] || 'Developer'}
              </p>
              <p className="text-[10px] text-[#64748B] uppercase font-bold">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header className="flex justify-between items-center h-12 px-6 bg-[#1E293B] border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-6">
            <span className="text-sm font-black text-[#6366F1] uppercase tracking-tighter">
              Axiom Workbench
            </span>
            {/* Workspace switcher placeholder */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 text-xs text-[#94A3B8] hover:text-[#e4e1ed] gap-1 px-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  Main Workspace
                  <span className="material-symbols-outlined text-[14px]">expand_more</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1E293B] border-[#334155] text-[#e4e1ed]">
                <DropdownMenuLabel className="text-[#94A3B8] text-xs">Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#334155]" />
                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-[#34343d]">
                  Main Workspace
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs cursor-pointer hover:bg-[#34343d]">
                  + New Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <div className="w-8 h-8 rounded-full bg-[#34343d] border border-[#334155] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#c7c4d7] text-lg">person</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1E293B] border-[#334155] text-[#e4e1ed] min-w-[180px]" align="end">
                <DropdownMenuLabel className="text-xs font-normal text-[#94A3B8]">
                  {session?.user?.email || 'Signed in'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#334155]" />
                <DropdownMenuItem
                  onClick={() => router.push('/settings')}
                  className="text-xs cursor-pointer hover:bg-[#34343d]"
                >
                  <span className="material-symbols-outlined text-[16px] mr-2">settings</span>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#334155]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-xs cursor-pointer text-[#EF4444] hover:bg-[#34343d]"
                >
                  <span className="material-symbols-outlined text-[16px] mr-2">logout</span>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
