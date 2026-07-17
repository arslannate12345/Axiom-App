'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSupabase } from '@/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
