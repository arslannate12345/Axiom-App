import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';

const SKIP_AUTH = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';

const MOCK_USER: User = {
  id: '7b08fc47-f0c4-475b-93d1-d236cf57d6de',
  app_metadata: {},
  user_metadata: { email: 'dev@axiom.app' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const MOCK_SESSION: Session = {
  access_token: 'dev-token',
  refresh_token: 'dev-refresh',
  expires_in: 3600,
  expires_at: Date.now() + 3600,
  token_type: 'bearer',
  user: MOCK_USER,
};

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: SKIP_AUTH ? MOCK_SESSION : null,
  user: SKIP_AUTH ? MOCK_USER : null,
  isLoading: !SKIP_AUTH,
  isAuthenticated: SKIP_AUTH,

  setSession: (session) =>
    set({ session, isAuthenticated: !!session }),

  setUser: (user) =>
    set({ user }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    set({
      session: data.session,
      user: data.user,
      isAuthenticated: true,
    });

    return { error: null };
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    const needsConfirmation = data.user?.identities?.length === 0 || !data.session;

    if (!needsConfirmation) {
      set({
        session: data.session,
        user: data.user,
        isAuthenticated: true,
      });
    }

    return { error: null, needsConfirmation };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    if (SKIP_AUTH) {
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isAuthenticated: !!data.session,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
      });
    });
  },
}));
