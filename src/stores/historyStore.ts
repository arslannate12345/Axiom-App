import { create } from 'zustand';
import type { HistoryEntry } from '../types/database';
import * as dataService from '../services/dataService';
import type { LogExecutionPayload } from '../services/dataService';

interface HistoryState {
  entries: HistoryEntry[];
  isLoading: boolean;

  loadHistory: (limit?: number) => Promise<void>;
  logEntry: (payload: LogExecutionPayload) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  isLoading: false,

  loadHistory: async (limit = 50) => {
    set({ isLoading: true });
    const entries = await dataService.getHistory(limit);
    set({ entries, isLoading: false });
  },

  logEntry: async (payload) => {
    const entry = await dataService.logExecution(payload);
    if (entry) {
      set((state) => ({
        entries: [entry, ...state.entries].slice(0, 100), // Keep last 100
      }));
    }
  },

  clearHistory: async () => {
    const success = await dataService.clearHistory();
    if (success) {
      set({ entries: [] });
    }
  },
}));
