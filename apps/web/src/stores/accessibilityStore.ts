import { create } from 'zustand';
import type { PerformanceAudit, AuditStrategy } from '@axiom/core/types';

interface AccessibilityState {
  currentUrl: string;
  strategy: AuditStrategy;
  isAuditing: boolean;
  activeAudit: PerformanceAudit | null;
  recentAudits: PerformanceAudit[];

  // Actions
  setUrl: (url: string) => void;
  setStrategy: (strategy: AuditStrategy) => void;
  setIsAuditing: (isAuditing: boolean) => void;
  setActiveAudit: (audit: PerformanceAudit | null) => void;
  setRecentAudits: (audits: PerformanceAudit[]) => void;
  addRecentAudit: (audit: PerformanceAudit) => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  currentUrl: '',
  strategy: 'desktop',
  isAuditing: false,
  activeAudit: null,
  recentAudits: [],

  setUrl: (url) => set({ currentUrl: url }),
  setStrategy: (strategy) => set({ strategy }),
  setIsAuditing: (isAuditing) => set({ isAuditing }),
  setActiveAudit: (audit) => set({ activeAudit: audit }),
  setRecentAudits: (audits) => set({ recentAudits: audits }),
  addRecentAudit: (audit) => set((state) => ({ 
    recentAudits: [audit, ...state.recentAudits]
  })),
}));
