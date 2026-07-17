import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Snapshot {
  id: string;
  requestId: string;
  name: string;
  body: any;
  createdAt: string;
}

export interface Contract {
  id: string;
  requestId: string;
  name: string;
  schema: any;
  createdAt: string;
}

interface RegressionState {
  snapshots: Record<string, Snapshot[]>;
  contracts: Record<string, Contract[]>;
  addSnapshot: (requestId: string, snapshot: Omit<Snapshot, 'id' | 'createdAt'>) => void;
  deleteSnapshot: (requestId: string, snapshotId: string) => void;
  addContract: (requestId: string, contract: Omit<Contract, 'id' | 'createdAt'>) => void;
  deleteContract: (requestId: string, contractId: string) => void;
}

export const useRegressionStore = create<RegressionState>()(
  persist(
    (set) => ({
      snapshots: {},
      contracts: {},
      addSnapshot: (requestId, snapshot) => set((state) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newSnapshot: Snapshot = {
          ...snapshot,
          id,
          requestId,
          createdAt: new Date().toISOString(),
        };
        return {
          snapshots: {
            ...state.snapshots,
            [requestId]: [...(state.snapshots[requestId] || []), newSnapshot],
          },
        };
      }),
      deleteSnapshot: (requestId, snapshotId) => set((state) => ({
        snapshots: {
          ...state.snapshots,
          [requestId]: (state.snapshots[requestId] || []).filter(s => s.id !== snapshotId),
        },
      })),
      addContract: (requestId, contract) => set((state) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newContract: Contract = {
          ...contract,
          id,
          requestId,
          createdAt: new Date().toISOString(),
        };
        return {
          contracts: {
            ...state.contracts,
            [requestId]: [...(state.contracts[requestId] || []), newContract],
          },
        };
      }),
      deleteContract: (requestId, contractId) => set((state) => ({
        contracts: {
          ...state.contracts,
          [requestId]: (state.contracts[requestId] || []).filter(c => c.id !== contractId),
        },
      })),
    }),
    {
      name: 'axiom-regression-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
