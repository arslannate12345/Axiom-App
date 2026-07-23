import { create } from 'zustand';
import type { LoadAudit, LoadTestConfig } from '@axiom/core/types';
import { runLoadTest } from '@/lib/load-service';

interface LoadState {
  config: LoadTestConfig;
  isRunning: boolean;
  activeAudit: LoadAudit | null;
  error: string | null;
  setConfig: (config: Partial<LoadTestConfig>) => void;
  startTest: (config?: LoadTestConfig) => Promise<LoadAudit | void>;
  reset: () => void;
}

const defaultConfig: LoadTestConfig = {
  url: '',
  method: 'GET',
  virtualUsers: 25,
  durationSeconds: 10,
  strategy: 'constant',
};

export const useLoadStore = create<LoadState>((set, get) => ({
  config: defaultConfig,
  isRunning: false,
  activeAudit: null,
  error: null,

  setConfig: (partial) => set((state) => ({ config: { ...state.config, ...partial }, error: null })),

  startTest: async (overrideConfig) => {
    const cfg = overrideConfig || get().config;
    if (!cfg.url || !cfg.url.trim()) {
      set({ error: 'Please enter a valid target URL' });
      return;
    }

    set({ isRunning: true, error: null });

    try {
      const audit = await runLoadTest(cfg);
      set({ activeAudit: audit, isRunning: false });
      return audit;
    } catch (err: any) {
      set({
        error: err.message || 'Load test execution failed. Make sure the server endpoint is reachable.',
        isRunning: false,
      });
    }
  },

  reset: () => set({ config: defaultConfig, activeAudit: null, error: null, isRunning: false }),
}));
