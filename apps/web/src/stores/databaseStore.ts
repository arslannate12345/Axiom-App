import { create } from 'zustand';
import type { DatabaseAudit } from '@axiom/core/types';
import { runDatabaseTest } from '@/lib/database-service';

interface DatabaseState {
  targetUrl: string;
  isScanning: boolean;
  activeAudit: DatabaseAudit | null;
  error: string | null;
  setTargetUrl: (url: string) => void;
  startScan: (url?: string) => Promise<DatabaseAudit | void>;
  reset: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
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
      const audit = await runDatabaseTest(url);
      set({ activeAudit: audit, isScanning: false });
      return audit;
    } catch (err: any) {
      set({
        error: err.message || 'Database health check failed. Make sure the server endpoint is reachable.',
        isScanning: false,
      });
    }
  },

  reset: () => set({ targetUrl: '', activeAudit: null, error: null, isScanning: false }),
}));
