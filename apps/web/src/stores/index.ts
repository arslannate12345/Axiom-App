import { createJSONStorage, persist } from 'zustand/middleware';
import type { PersistStorage } from '@axiom/core/adapters';

export function createWebPersistStorage(): PersistStorage {
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
}

export function createWebPersistConfig<T>(name: string) {
  return {
    name,
    storage: createJSONStorage<T>(() => ({
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value as string);
        } catch {}
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch {}
      },
    })),
    skipHydration: true,
  };
}
