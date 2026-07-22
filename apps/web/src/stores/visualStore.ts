import { create } from 'zustand';
import type { VisualCaptureSession, ViewportConfig } from '@axiom/core/types';
import { runVisualCapture, DEFAULT_VIEWPORTS } from '@/lib/visual-service';

interface VisualState {
  targetUrl: string;
  selectedViewports: ViewportConfig[];
  activeSession: VisualCaptureSession | null;
  isCapturing: boolean;
  error: string | null;
  setTargetUrl: (url: string) => void;
  toggleViewport: (vp: ViewportConfig) => void;
  startCapture: (url?: string) => Promise<VisualCaptureSession | void>;
  reset: () => void;
}

export const useVisualStore = create<VisualState>((set, get) => ({
  targetUrl: '',
  selectedViewports: DEFAULT_VIEWPORTS,
  activeSession: null,
  isCapturing: false,
  error: null,

  setTargetUrl: (targetUrl: string) => set({ targetUrl, error: null }),

  toggleViewport: (vp: ViewportConfig) => {
    const current = get().selectedViewports;
    const exists = current.some((item) => item.id === vp.id);
    if (exists) {
      if (current.length <= 1) return; // Keep at least 1 viewport
      set({ selectedViewports: current.filter((item) => item.id !== vp.id) });
    } else {
      set({ selectedViewports: [...current, vp] });
    }
  },

  startCapture: async (urlToScan?: string) => {
    const url = urlToScan || get().targetUrl;
    if (!url || !url.trim()) {
      set({ error: 'Please enter a valid target URL' });
      return;
    }

    set({ isCapturing: true, error: null });

    try {
      const session = await runVisualCapture(url, get().selectedViewports);
      set({ activeSession: session, isCapturing: false });
      return session;
    } catch (err: any) {
      set({
        error: err.message || 'Visual capture failed.',
        isCapturing: false,
      });
    }
  },

  reset: () => set({ targetUrl: '', activeSession: null, error: null, isCapturing: false }),
}));
