'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
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
import * as service from '@/lib/supabase-service';
import type { RequestRecord } from '@/lib/supabase-service';
import { METHOD_COLORS } from '@/lib/constants';
import { useDomainStore, useActiveDomain } from '@/stores/domainStore';
import { DOMAINS, DOMAIN_IDS, getDomainForRoute } from '@/lib/domainRegistry';
import type { TestingDomainId } from '@axiom/core/types';

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
  const [domainSwitcherOpen, setDomainSwitcherOpen] = useState(false);

  const activeDomain = useActiveDomain();
  const setDomain = useDomainStore((s) => s.setDomain);

  useEffect(() => { setMounted(true); }, []);

  // Sync domain store with current route on navigation
  useEffect(() => {
    const detected = getDomainForRoute(pathname);
    if (detected !== activeDomain.id) {
      setDomain(detected);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleDomainSwitch = (id: TestingDomainId) => {
    setDomain(id);
    const domain = DOMAINS[id];
    // Navigate to the domain's first nav item
    router.push(domain.primaryAction.href);
    setDomainSwitcherOpen(false);
  };

  const sidebarWidth = collapsed ? 56 : 260;

  return (
    <AnimatedBackground>
    <div className="flex h-screen overflow-hidden">
      {/* SideNav */}
      <aside
        className="shrink-0 backdrop-blur-xl border-r border-sidebar-border/60 flex flex-col z-50 transition-all duration-300 ease-out"
        style={{ 
          width: sidebarWidth, 
          backgroundColor: `${activeDomain.accentColor}08` // 08 hex = ~3% opacity tint over background
        }}
      >
        {/* Brand */}
        <div className={`flex items-center border-b border-sidebar-border min-h-[52px] ${collapsed ? 'justify-center px-0' : 'justify-between px-3'} py-4`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary-foreground text-lg" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
                </div>
                <div className="whitespace-nowrap">
                  <h1 className="text-sm font-bold text-sidebar-foreground">Axiom</h1>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Testing Platform</p>
                </div>
              </div>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-sidebar-foreground transition-colors"
                title="Collapse sidebar"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-sidebar-foreground transition-colors"
              title="Expand sidebar"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          )}
        </div>

        {/* ─── Domain Switcher ─────────────────────────────── */}
        <div className={`border-b border-sidebar-border/60 ${collapsed ? 'px-1.5 py-2' : 'px-3 py-2.5'}`}>
          {!collapsed ? (
            <button
              onClick={() => setDomainSwitcherOpen(!domainSwitcherOpen)}
              className="w-full group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 hover:bg-muted/80 active:scale-[0.98]"
              style={{
                background: domainSwitcherOpen
                  ? `${activeDomain.accentColor}12`
                  : undefined,
              }}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{ background: activeDomain.gradient }}
              >
                <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {activeDomain.icon}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-tight">{activeDomain.label}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{activeDomain.tagline}</p>
              </div>
              <span
                className={cn(
                  'material-symbols-outlined text-[14px] text-muted-foreground transition-transform duration-200',
                  domainSwitcherOpen && 'rotate-180',
                )}
              >
                expand_more
              </span>
            </button>
          ) : (
            <button
              onClick={() => setDomainSwitcherOpen(!domainSwitcherOpen)}
              className="w-full flex justify-center py-1"
              title={activeDomain.label}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
                style={{ background: activeDomain.gradient }}
              >
                <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {activeDomain.icon}
                </span>
              </div>
            </button>
          )}

          {/* Domain Switcher Dropdown */}
          <AnimatePresence>
            {domainSwitcherOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className={`pt-2 space-y-0.5 ${collapsed ? 'px-0' : ''}`}>
                  {DOMAIN_IDS.map((id) => {
                    const domain = DOMAINS[id];
                    const isActive = id === activeDomain.id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleDomainSwitch(id)}
                        onMouseEnter={() => router.prefetch(domain.primaryAction.href)}
                        className={cn(
                          'w-full flex items-center gap-2.5 rounded-md transition-all duration-150 active:scale-[0.97]',
                          collapsed ? 'px-1 py-2 justify-center' : 'px-2.5 py-1.5',
                          isActive
                            ? 'bg-muted/80'
                            : 'hover:bg-muted/50',
                        )}
                      >
                        <div
                          className={cn(
                            'w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all duration-200',
                            !isActive && 'opacity-70 hover:opacity-100',
                          )}
                          style={{
                            background: isActive ? domain.gradient : `${domain.accentColor}20`,
                            boxShadow: isActive ? `0 0 0 1.5px var(--sidebar), 0 0 0 3px ${domain.accentColor}` : undefined,
                          }}
                        >
                          <span
                            className={cn(
                              'material-symbols-outlined text-[14px]',
                              isActive ? 'text-white' : '',
                            )}
                            style={{
                              color: isActive ? undefined : domain.accentColor,
                              fontVariationSettings: "'FILL' 1",
                            }}
                          >
                            {domain.icon}
                          </span>
                        </div>
                        {!collapsed && (
                          <div className="flex-1 text-left min-w-0">
                            <p className={cn(
                              'text-[12px] truncate leading-tight',
                              isActive ? 'font-semibold text-sidebar-foreground' : 'text-muted-foreground',
                            )}>
                              {domain.label}
                            </p>
                          </div>
                        )}
                        {!collapsed && isActive && (
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: domain.accentColor }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Domain Primary Action */}
        {!collapsed && (
          <div className="px-4 py-3">
            <Button
              onClick={() => router.push(activeDomain.primaryAction.href)}
              className="w-full h-9 text-[13px] font-semibold rounded transition-all duration-200 hover:shadow-md active:scale-[0.97]"
              style={{
                background: activeDomain.gradient,
                color: 'white',
              }}
            >
              <span className="material-symbols-outlined text-[18px] mr-1.5">{activeDomain.primaryAction.icon}</span>
              {activeDomain.primaryAction.label}
            </Button>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-3">
            <button
              onClick={() => router.push(activeDomain.primaryAction.href)}
              className="w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200 hover:shadow-md active:scale-[0.95]"
              style={{ background: activeDomain.gradient }}
              title={activeDomain.primaryAction.label}
            >
              <span className="material-symbols-outlined text-white text-[18px]">{activeDomain.primaryAction.icon}</span>
            </button>
          </div>
        )}

        {/* Navigation — dynamic from active domain */}
        <nav className="flex-1 px-3 space-y-0.5 py-1 overflow-y-auto">
          {/* Domain section label */}
          {!collapsed && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 pt-1 pb-2">
              {activeDomain.label}
            </p>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeDomain.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="space-y-0.5"
            >
              {activeDomain.navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md text-sm transition-all duration-200 active:scale-[0.97]',
                      collapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2',
                      isActive
                        ? 'font-medium'
                        : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-muted/50',
                    )}
                    style={isActive ? {
                      backgroundColor: `${activeDomain.accentColor}15`,
                      color: activeDomain.accentColor,
                      borderRight: `2px solid ${activeDomain.accentColor}`,
                    } : undefined}
                  >
                    <span
                      className="material-symbols-outlined text-[20px] shrink-0"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </motion.div>
          </AnimatePresence>
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
                <p className="text-[12px] text-muted-foreground uppercase font-bold">Pro Plan</p>
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
        <header className="flex justify-between items-center h-12 px-6 bg-card/80 backdrop-blur-xl border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5 flex-1">
            {collapsed && (
              <span className="text-sm font-black text-primary uppercase tracking-tighter hidden sm:inline">
                Axiom
              </span>
            )}
            {/* Active domain breadcrumb */}
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: activeDomain.accentColor }}
              />
              <span className="text-xs font-medium text-foreground/80 hidden sm:inline">
                {activeDomain.label}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">/ Workbench</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SearchBar />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col min-h-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
    </AnimatedBackground>
  );
}

// ─── Search Bar ──────────────────────────────────────────

function SearchBar() {
  const router = useRouter();
  const activeDomain = useActiveDomain();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<RequestRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else { setQuery(''); setResults([]); }
  }, [open]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const ws = await service.getWorkspaces();
      if (ws.length === 0) return;
      const cols = await service.getCollections(ws[0].id);
      if (cols.length === 0) return;
      const allReqs: RequestRecord[] = [];
      for (const col of cols.slice(0, 5)) {
        const reqs = await service.getRequests(col.id);
        const matches = reqs.filter((r) =>
          r.name.toLowerCase().includes(q.toLowerCase()) ||
          r.url.toLowerCase().includes(q.toLowerCase()),
        );
        allReqs.push(...matches);
        if (allReqs.length >= 10) break;
      }
      setResults(allReqs.slice(0, 10));
    }, 200);
  }, []);

  const handleSelect = (req: RequestRecord) => {
    try { sessionStorage.setItem('axiom-open-request', JSON.stringify(req)); } catch {}
    setOpen(false);
    router.push('/client');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-7 px-3 bg-background border border-border rounded text-[12px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors min-w-[200px]"
      >
        <span className="material-symbols-outlined text-[14px]">search</span>
        <span className="flex-1 text-left">{activeDomain.searchPlaceholder}</span>
        <kbd className="text-[12px] px-1 py-0.5 bg-muted border border-border rounded text-muted-foreground">Ctrl+K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">search</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={`Search saved ${activeDomain.id === 'api' ? 'requests' : 'items'}...`}
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="text-[12px] px-1 py-0.5 bg-muted border border-border rounded text-muted-foreground">esc</kbd>
            </div>
            <div className="max-h-[320px] overflow-auto">
              {query.trim().length < 2 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-[12px] text-muted-foreground">Type to search {activeDomain.id === 'api' ? 'requests by name or URL' : 'items'}</p>
                </div>
              )}
              {query.trim().length >= 2 && results.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-[12px] text-muted-foreground">No matching results found</p>
                </div>
              )}
              {results.map((req) => (
                <button
                  key={req.id}
                  onClick={() => handleSelect(req)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors"
                >
                  <span className="font-mono text-[12px] font-bold w-9 shrink-0" style={{ color: METHOD_COLORS[req.method] || '#64748B' }}>
                    {req.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{req.name}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{req.url}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}