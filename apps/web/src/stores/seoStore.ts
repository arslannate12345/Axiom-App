import { create } from 'zustand';
import type { SeoAudit } from '@axiom/core/types';
import { runSeoAudit } from '@/lib/seo-service';

interface SeoState {
  targetUrl: string;
  isAuditing: boolean;
  activeAudit: SeoAudit | null;
  error: string | null;
  setTargetUrl: (url: string) => void;
  startAudit: (url?: string) => Promise<SeoAudit | void>;
  reset: () => void;
}

export const useSeoStore = create<SeoState>((set, get) => ({
  targetUrl: '',
  isAuditing: false,
  activeAudit: null,
  error: null,

  setTargetUrl: (targetUrl: string) => set({ targetUrl, error: null }),

  startAudit: async (urlToAudit?: string) => {
    const url = urlToAudit || get().targetUrl;
    if (!url || !url.trim()) {
      set({ error: 'Please enter a valid target URL' });
      return;
    }

    set({ isAuditing: true, error: null });

    try {
      const audit = await runSeoAudit(url);
      set({ activeAudit: audit, isAuditing: false });
      return audit;
    } catch (err: any) {
      set({
        error: err.message || 'SEO audit failed. Make sure the server or site is reachable.',
        isAuditing: false,
      });
    }
  },

  reset: () => set({ targetUrl: '', activeAudit: null, error: null, isAuditing: false }),
}));
