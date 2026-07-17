'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/providers/supabase-provider';

export default function Home() {
  const router = useRouter();
  const { session } = useSupabase();

  useEffect(() => {
    if (session) {
      router.replace('/client');
    } else {
      router.replace('/login');
    }
  }, [session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
      <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
