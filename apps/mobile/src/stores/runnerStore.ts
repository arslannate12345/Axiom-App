import { create } from 'zustand';
import type { RunnerStepState, RunStatus } from '../types/runner';
import type { Request } from '../types/database';

interface RunnerState {
  isOpen: boolean;
  activeCollectionId: string | null;
  status: RunStatus;
  steps: RunnerStepState[];
  activeStepIndex: number;
  totalDuration: number | null;
  
  // Actions
  openRunner: (collectionId: string, requests: Request[]) => void;
  closeRunner: () => void;
  setRunStatus: (status: RunStatus) => void;
  updateStepProgress: (index: number, state: RunnerStepState) => void;
  setTotalDuration: (duration: number) => void;
}

export const useRunnerStore = create<RunnerState>((set) => ({
  isOpen: false,
  activeCollectionId: null,
  status: 'pending',
  steps: [],
  activeStepIndex: 0,
  totalDuration: null,

  openRunner: (collectionId, requests) =>
    set({
      isOpen: true,
      activeCollectionId: collectionId,
      status: 'pending',
      steps: requests.map((req) => ({ request: req, status: 'pending' })),
      activeStepIndex: 0,
      totalDuration: null,
    }),

  closeRunner: () =>
    set({
      isOpen: false,
      activeCollectionId: null,
      status: 'pending',
      steps: [],
      activeStepIndex: 0,
      totalDuration: null,
    }),

  setRunStatus: (status) => set({ status }),

  updateStepProgress: (index, state) =>
    set((prev) => {
      const newSteps = [...prev.steps];
      newSteps[index] = state;
      return { steps: newSteps, activeStepIndex: index };
    }),

  setTotalDuration: (duration) => set({ totalDuration: duration }),
}));
