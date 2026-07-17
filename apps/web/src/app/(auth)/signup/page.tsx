'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Account created! Please sign in.');
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4">
      <Card className="w-full max-w-[420px] bg-[#1E293B] border-[#334155] shadow-2xl">
        <CardContent className="p-8">
          {/* Header Identity */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#6366F1] text-2xl">person_add</span>
              <h1 className="text-lg font-black tracking-tighter uppercase text-[#e4e1ed]">
                Create Account
              </h1>
            </div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.2em]">
              Join AXIOM to sync your collections
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSignup} className="space-y-5">
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
              <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Password
              </label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 bg-[#0F172A] border-[#334155] text-[#e4e1ed] font-mono text-xs focus:border-[#6366F1] focus:ring-0 placeholder:text-[#475569]"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  CREATING ACCOUNT...
                </>
              ) : (
                <>
                  Create Account
                  <span className="material-symbols-outlined text-[16px] ml-1">person_add</span>
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="h-[1px] flex-1 bg-[#334155]" />
            <span className="text-[11px] font-semibold text-[#334155]">OR</span>
            <div className="h-[1px] flex-1 bg-[#334155]" />
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/login"
              className="text-xs text-[#94A3B8] hover:text-[#e4e1ed] transition-colors"
            >
              Already have an account?{' '}
              <span className="text-[#6366F1] font-medium">Sign in</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
