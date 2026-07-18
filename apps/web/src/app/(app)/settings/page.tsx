'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSupabase } from '@/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import type { ReportRecord } from '@/lib/supabase-service';

export default function SettingsPage() {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => { setMounted(true); loadReports(); }, []);

  const loadReports = async () => { setReports(await service.getUserReports()); };

  const handleDeleteReport = async (id: string) => {
    const ok = await service.deleteReport(id);
    if (ok) { setReports((r) => r.filter((x) => x.id !== id)); toast.success('Report deleted'); }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    router.replace('/login');
  };

  const user = session?.user;
  const avatarLetter = user?.email?.charAt(0)?.toUpperCase() || 'D';

  return (
    <div className="flex-1 overflow-y-auto bg-background p-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center bg-primary/10 mb-3">
            <span className="text-2xl font-bold text-primary">{avatarLetter}</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">{user?.email?.split('@')[0] || 'Developer'}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase tracking-widest border border-primary/30">Pro Plan</span>
          </div>
        </div>

        <Card className="bg-card border-border rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
            <span className="material-symbols-outlined text-sm text-muted-foreground">lock</span>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-red-500/80">Sign Out</p><p className="text-xs text-muted-foreground">Terminate your session.</p></div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-8 px-3 text-xs text-red-500/80 border-red-500/20 hover:bg-red-500/10 hover:text-red-500">Logout</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-bold">Sign Out</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground">Are you sure?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="text-xs bg-destructive text-white" onClick={handleLogout} disabled={loading}>
                      {loading ? 'Signing out...' : 'Sign Out'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Workspace</h3>
            <span className="material-symbols-outlined text-sm text-muted-foreground">terminal</span>
          </div>
          <CardContent className="p-5">
            <div className="bg-background px-3 py-2 border border-border rounded text-xs font-mono text-primary inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Main Workspace
            </div>
          </CardContent>
        </Card>

        {/* Reports */}
        <Card className="bg-card border-border rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reports</h3>
            <span className="material-symbols-outlined text-sm text-muted-foreground">description</span>
          </div>
          <CardContent className="p-0">
            {reports.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No reports yet. Run a collection to generate one.</p>
            ) : (
              <ScrollArea className="max-h-60">
                {reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-sm text-primary shrink-0">description</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</p>
                          <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">{r.report_type}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/reports/${r.share_token}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Report link copied');
                        }}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Copy share link"
                      >
                        <span className="material-symbols-outlined text-sm">link</span>
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1 text-muted-foreground hover:text-[#EF4444] transition-colors" title="Delete report">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border text-foreground">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm font-bold">Delete Report</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-muted-foreground">Permanently delete &quot;{r.name}&quot;?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="text-xs bg-destructive text-white" onClick={() => handleDeleteReport(r.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">{mounted && theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">{mounted && theme === 'dark' ? 'High-Contrast Dark' : 'Light'}</p>
                </div>
              </div>
              <div className="flex bg-background p-1 rounded border border-border">
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${mounted && theme === 'dark' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${mounted && theme === 'light' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Light
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
