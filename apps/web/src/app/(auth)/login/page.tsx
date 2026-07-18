'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import Link from 'next/link';
import { useSupabase } from '@/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Authenticated successfully');
    router.replace('/client');
  };

  return (
    <AnimatedBackground>
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[420px] bg-card border-border shadow-2xl">
        <CardContent className="p-8">
          {/* Header Identity */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-2xl">api</span>
              <h1 className="text-lg font-black tracking-tighter uppercase text-foreground">
                AXIOM
              </h1>
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
              Workbench Authentication
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                Email Address
              </label>
              <Input
                type="email"
                placeholder="developer@axiom.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-background border-border text-foreground font-mono text-xs focus:border-primary focus:ring-0 placeholder:text-muted-foreground"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toast.info('Password reset coming soon')}
                  className="text-[13px] font-semibold text-primary hover:underline transition-all"
                >
                  FORGOT?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 bg-background border-border text-foreground font-mono text-xs focus:border-primary focus:ring-0 placeholder:text-muted-foreground"
              />
            </div>

            {/* Primary CTA */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-[13px] font-semibold uppercase tracking-widest rounded"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[16px] ml-1">login</span>
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <Separator className="flex-1 bg-border" />
            <span className="text-[13px] font-semibold text-muted-foreground">OR</span>
            <Separator className="flex-1 bg-border" />
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/signup"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              New to the workbench?{' '}
              <span className="text-primary font-medium">Create account</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Technical Footer */}
      <div className="fixed bottom-8 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-[14px] text-muted-foreground">info</span>
        <span className="text-[13px] font-mono text-muted-foreground">
          Connection secured via TLS 1.3 / Axiom-Auth-v2
        </span>
      </div>
    </div>
    </AnimatedBackground>
  );
}