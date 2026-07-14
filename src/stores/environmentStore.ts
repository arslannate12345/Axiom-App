import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Environment, EnvironmentVariable } from '../types/database';
import * as dataService from '../services/dataService';

export let GLOBAL_ENV_ID = 'global-env-id'; // Can be reassigned to actual UUID

interface EnvironmentState {
  environments: Environment[];
  variables: Record<string, EnvironmentVariable[]>;
  activeEnvironmentId: string | null;
  setEnvironments: (environments: Environment[]) => void;
  setVariables: (envId: string, vars: EnvironmentVariable[]) => void;
  setActiveEnvironment: (envId: string | null) => void;
  getActiveVariables: () => Record<string, string>;
  loadEnvironments: (workspaceId: string) => Promise<void>;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: [],
      variables: {},
      activeEnvironmentId: null,

      setEnvironments: (environments) => set({ environments }),

      setVariables: (envId, vars) =>
        set((state) => ({
          variables: { ...state.variables, [envId]: vars },
        })),

      setActiveEnvironment: (envId) => set({ activeEnvironmentId: envId }),

      getActiveVariables: () => {
        const { activeEnvironmentId, variables, environments } = get();
        const globalEnv = environments.find(e => e.name === 'Global');
        const globalEnvId = globalEnv ? globalEnv.id : GLOBAL_ENV_ID;

        const globalVars = variables[globalEnvId] ?? [];
        const activeVars = (activeEnvironmentId && activeEnvironmentId !== globalEnvId) 
          ? (variables[activeEnvironmentId] ?? []) 
          : [];

        const result: Record<string, string> = {};
        
        // 1. Load global variables first
        for (const v of globalVars) {
          if (v.key) {
            result[v.key.trim()] = v.value;
          }
        }
        
        // 2. Override with active environment variables
        for (const v of activeVars) {
          if (v.key) {
            result[v.key.trim()] = v.value;
          }
        }
        
        return result;
      },

      loadEnvironments: async (workspaceId: string) => {
        let envs = await dataService.getEnvironments(workspaceId);
        
        // Ensure "Global" environment exists
        let globalEnv = envs.find(e => e.name === 'Global');
        if (!globalEnv) {
          globalEnv = await dataService.createEnvironment(workspaceId, 'Global');
          if (globalEnv) {
            envs = [globalEnv, ...envs];
            // Migrate local variables if any exist under the old mock ID
            const { variables } = get();
            const oldLocalVars = variables['global-env-id'] || [];
            for (const v of oldLocalVars) {
              await dataService.upsertEnvironmentVariable(globalEnv.id, v.key, v.value, v.is_secret);
            }
          }
        }
        
        if (globalEnv) {
          GLOBAL_ENV_ID = globalEnv.id;
        }

        set({ environments: envs });
        
        // Fetch variables for all environments
        const allVars: Record<string, EnvironmentVariable[]> = {};
        for (const env of envs) {
          const vars = await dataService.getEnvironmentVariables(env.id);
          allVars[env.id] = vars;
        }
        
        set({ variables: allVars });

        // If no active env is set, or active env was deleted, default to Global
        const { activeEnvironmentId } = get();
        if (!activeEnvironmentId || !envs.find(e => e.id === activeEnvironmentId)) {
          set({ activeEnvironmentId: globalEnv?.id ?? null });
        }
      }
    }),
    {
      name: 'environment-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
