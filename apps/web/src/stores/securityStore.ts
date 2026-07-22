import { create } from 'zustand';
import type { SecurityAudit } from '@axiom/core/types';
import { runSecurityScan } from '@/lib/security-service';

interface SecurityState {
  targetUrl: string;
  isScanning: boolean;
  activeAudit: SecurityAudit | null;
  error: string | null;
  setTargetUrl: (url: string) => void;
  startScan: (url?: string) => Promise<SecurityAudit | void>;
  reset: () => void;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  targetUrl: '',
  isScanning: false,
  activeAudit: null,
  error: null,

  setTargetUrl: (targetUrl: string) => set({ targetUrl, error: null }),

  startScan: async (urlToScan?: string) => {
    const url = urlToScan || get().targetUrl;
    if (!url || !url.trim()) {
      set({ error: 'Please enter a valid target URL' });
      return;
    }

    set({ isScanning: true, error: null });

    try {
      const audit = await runSecurityScan(url);
      set({ activeAudit: audit, isScanning: false });
      return audit;
    } catch (err: any) {
      set({
        error: err.message || 'Security scan failed. Make sure the server or site is reachable.',
        isScanning: false,
      });
    }
  },

  reset: () => set({ targetUrl: '', activeAudit: null, error: null, isScanning: false }),
}));
