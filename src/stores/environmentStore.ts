import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Environment, EnvironmentVariable } from '../types/database';

export const GLOBAL_ENV_ID = 'global-env-id';

interface EnvironmentState {
  environments: Environment[];
  variables: Record<string, EnvironmentVariable[]>;
  activeEnvironmentId: string | null;
  setEnvironments: (environments: Environment[]) => void;
  setVariables: (envId: string, vars: EnvironmentVariable[]) => void;
  setActiveEnvironment: (envId: string | null) => void;
  getActiveVariables: () => Record<string, string>;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: [],
      variables: {},
      activeEnvironmentId: GLOBAL_ENV_ID,

      setEnvironments: (environments) => set({ environments }),

      setVariables: (envId, vars) =>
        set((state) => ({
          variables: { ...state.variables, [envId]: vars },
        })),

      setActiveEnvironment: (envId) => set({ activeEnvironmentId: envId }),

      getActiveVariables: () => {
        const { activeEnvironmentId, variables } = get();
        if (!activeEnvironmentId) return {};
        const vars = variables[activeEnvironmentId] ?? [];
        const result: Record<string, string> = {};
        for (const v of vars) {
          if (v.key) {
            result[v.key.trim()] = v.value;
          }
        }
        return result;
      },
    }),
    {
      name: 'environment-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
