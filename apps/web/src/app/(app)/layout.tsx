'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { AnimatedBackground } from '@/components/AnimatedBackground';
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
import { cn } from '@/lib/utils';

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
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const sidebarWidth = collapsed ? 56 : 260;

  return (
    <AnimatedBackground>
    <div className="flex h-screen overflow-hidden">
      {/* SideNav */}
      <aside
        className="shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-200"
        style={{ width: sidebarWidth }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-sidebar-border min-h-[52px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-foreground text-lg" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
            </div>
            {!collapsed && (
              <div className="whitespace-nowrap">
                <h1 className="text-sm font-bold text-sidebar-foreground">Axiom</h1>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">V1.2.0-stable</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-sidebar-foreground transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* New Request Button */}
        {!collapsed && (
          <div className="px-4 py-3">
            <Button
              onClick={() => router.push('/client')}
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold rounded"
            >
              <span className="material-symbols-outlined text-[18px] mr-1">add</span>
              New Request
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 py-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md text-sm transition-colors duration-150',
                  collapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2',
                  isActive
                    ? 'bg-secondary/50 text-secondary-foreground font-medium border-r-2 border-primary'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-muted/50',
                )}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-xs truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          <Link
            href="/settings"
            title={collapsed ? 'Settings' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md text-xs transition-colors duration-150',
              collapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2',
              pathname === '/settings'
                ? 'bg-secondary/50 text-secondary-foreground font-medium border-r-2 border-primary'
                : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-muted/50',
            )}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">settings</span>
            {!collapsed && <span className="text-xs">Settings</span>}
          </Link>

          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground text-xs cursor-pointer hover:text-sidebar-foreground hover:bg-muted/50 rounded-md transition-colors">
              <span className="material-symbols-outlined text-[20px] shrink-0">help_outline</span>
              Support
            </div>
          )}

          {!collapsed ? (
            <div className="flex items-center gap-3 px-3 py-2 mt-2">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                <span className="material-symbols-outlined text-muted-foreground text-lg">person</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-sidebar-foreground truncate">
                  {session?.user?.email?.split('@')[0] || 'Developer'}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Pro Plan</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                <span className="material-symbols-outlined text-muted-foreground text-lg">person</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header className="flex justify-between items-center h-12 px-6 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {collapsed && (
              <span className="text-sm font-black text-primary uppercase tracking-tighter hidden sm:inline">
                Axiom
              </span>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">Workbench</span>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                    <span className="material-symbols-outlined text-muted-foreground text-lg">person</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border text-foreground min-w-[180px]" align="end">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {session?.user?.email || 'Signed in'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => router.push('/settings')}
                  className="text-xs cursor-pointer hover:bg-muted"
                >
                  <span className="material-symbols-outlined text-[16px] mr-2">settings</span>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-xs cursor-pointer text-destructive hover:bg-muted"
                >
                  <span className="material-symbols-outlined text-[16px] mr-2">logout</span>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content — CRITICAL: must be flex container so children flex-1 works */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
    </AnimatedBackground>
  );
}