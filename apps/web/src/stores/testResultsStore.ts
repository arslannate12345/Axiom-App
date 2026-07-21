import { create } from 'zustand';

interface TestResultsState {
  results: Record<string, unknown>;
  sections: string[];
  setSectionResults: (section: string, data: unknown) => void;
  clear: () => void;
}

export const useTestResultsStore = create<TestResultsState>((set) => ({
  results: {},
  sections: [],
  setSectionResults: (section, data) =>
    set((s) => ({
      results: { ...s.results, [section]: data },
      sections: s.sections.includes(section) ? s.sections : [...s.sections, section],
    })),
  clear: () => set({ results: {}, sections: [] }),
}));
