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
      <Card className="w-full max-w-[420px] bg-[#1E293B] border-[#334155] shadow-2xl">
        <CardContent className="p-8">
          {/* Header Identity */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#6366F1] text-2xl">api</span>
              <h1 className="text-lg font-black tracking-tighter uppercase text-[#e4e1ed]">
                AXIOM
              </h1>
            </div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.2em]">
              Workbench Authentication
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                Email Address
              </label>
              <Input
                type="email"
                placeholder="developer@axiom.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-[#0F172A] border-[#334155] text-[#e4e1ed] font-mono text-xs focus:border-[#6366F1] focus:ring-0 placeholder:text-[#475569]"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toast.info('Password reset coming soon')}
                  className="text-[11px] font-semibold text-[#6366F1] hover:underline transition-all"
                >
                  FORGOT?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 bg-[#0F172A] border-[#334155] text-[#e4e1ed] font-mono text-xs focus:border-[#6366F1] focus:ring-0 placeholder:text-[#475569]"
              />
            </div>

            {/* Primary CTA */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[11px] font-semibold uppercase tracking-widest rounded"
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
            <Separator className="flex-1 bg-[#334155]" />
            <span className="text-[11px] font-semibold text-[#334155]">OR</span>
            <Separator className="flex-1 bg-[#334155]" />
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/signup"
              className="text-xs text-[#94A3B8] hover:text-[#e4e1ed] transition-colors"
            >
              New to the workbench?{' '}
              <span className="text-[#6366F1] font-medium">Create account</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Technical Footer */}
      <div className="fixed bottom-8 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-[14px] text-[#64748B]">info</span>
        <span className="text-[11px] font-mono text-[#64748B]">
          Connection secured via TLS 1.3 / Axiom-Auth-v2
        </span>
      </div>
    </div>
    </AnimatedBackground>
  );
}
