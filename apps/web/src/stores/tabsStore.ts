import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HttpMethod, BodyType, KeyValuePair, ResponseTiming } from '@/lib/api';
import type { Assertion } from '@/lib/assertions';
import type { Extraction } from '@/lib/extractions';

export interface RequestTab {
  id: string;
  title: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  body: string;
  response: ResponseTiming | null;
  error: string | null;
  isLoading: boolean;
  dirty: boolean;
  assertions: Assertion[];
  extractions: Extraction[];
}

interface TabsState {
  tabs: RequestTab[];
  activeTabId: string | null;

  addTab: (fromRequest?: Partial<RequestTab>) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<RequestTab>) => void;
  duplicateTab: (id: string) => void;
  markClean: (id: string) => void;
}

let counter = 0;

function nextId(): string {
  counter += 1;
  return `tab_${Date.now()}_${counter}`;
}

function defaultTab(overrides?: Partial<RequestTab>): RequestTab {
  return {
    id: nextId(),
    title: 'Untitled Request',
    method: 'GET',
    url: '',
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    queryParams: [],
    bodyType: 'none',
    body: '',
    response: null,
    error: null,
    isLoading: false,
    dirty: false,
    assertions: [],
    extractions: [],
    ...overrides,
  };
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (fromRequest) => {
        const tab = defaultTab(fromRequest);
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
        return tab.id;
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get();
        const idx = tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        const next = [...tabs];
        next.splice(idx, 1);
        let nextActive = activeTabId;
        if (activeTabId === id) {
          if (next.length === 0) {
            nextActive = null;
          } else {
            const newIdx = Math.min(idx, next.length - 1);
            nextActive = next[newIdx].id;
          }
        }
        set({ tabs: next, activeTabId: nextActive });
      },

      setActiveTab: (id) => {
        set({ activeTabId: id });
      },

      updateTab: (id, patch) => {
        const transientKeys = new Set(['response', 'error', 'isLoading']);
        const isTransientOnly = Object.keys(patch).every((k) => transientKeys.has(k));
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === id ? { ...t, ...patch, dirty: isTransientOnly ? t.dirty : true } : t,
          ),
        }));
      },

      duplicateTab: (id) => {
        const tab = get().tabs.find((t) => t.id === id);
        if (!tab) return;
        const clone = defaultTab({
          title: `${tab.title} (Copy)`,
          method: tab.method,
          url: tab.url,
          headers: tab.headers.map((h) => ({ ...h })),
          queryParams: tab.queryParams.map((p) => ({ ...p })),
          bodyType: tab.bodyType,
          body: tab.body,
        });
        set((s) => {
          const idx = s.tabs.findIndex((t) => t.id === id);
          const next = [...s.tabs];
          next.splice(idx + 1, 0, clone);
          return { tabs: next, activeTabId: clone.id };
        });
      },

      markClean: (id) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, dirty: false } : t)),
        }));
      },
    }),
    {
      name: 'axiom-tabs',
      partialize: (state) => ({
        tabs: state.tabs.map((t) => ({
          id: t.id,
          title: t.title,
          method: t.method,
          url: t.url,
          headers: t.headers,
          queryParams: t.queryParams,
          bodyType: t.bodyType,
          body: t.body,
          dirty: t.dirty,
          assertions: (t.assertions || []).map((a) => ({ ...a, result: undefined, actual: undefined, error: undefined })),
          extractions: (t.extractions || []).map((e) => ({ ...e, value: undefined, error: undefined })),
        })),
        activeTabId: state.activeTabId,
      }),
      merge: (persistedState: any, currentState) => {
        if (!persistedState) return currentState;
        return {
          ...currentState,
          ...persistedState,
          tabs: (persistedState.tabs || []).map((t: any) => ({
            ...defaultTab(),
            ...t,
            headers: t.headers || [{ key: 'Content-Type', value: 'application/json', enabled: true }],
            queryParams: t.queryParams || [],
            assertions: t.assertions || [],
            extractions: t.extractions || [],
          })),
        };
      },
    },
  ),
);
