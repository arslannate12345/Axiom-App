import { create } from 'zustand';
import type { Workspace, Collection, Request } from '../types/database';
import * as dataService from '../services/dataService';
import type { SaveRequestPayload } from '../services/dataService';

interface CollectionsState {
  workspaces: Workspace[];
  collections: Record<string, Collection[]>;
  requests: Record<string, Request[]>;
  activeWorkspaceId: string | null;
  expandedCollections: Set<string>;
  selectedRequest: Request | null;
  isLoading: boolean;

  // Actions
  loadWorkspaces: () => Promise<void>;
  loadCollections: (workspaceId: string) => Promise<void>;
  loadRequests: (collectionId: string) => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  toggleCollection: (id: string) => void;
  setSelectedRequest: (req: Request | null) => void;

  // CRUD
  createWorkspace: (name: string) => Promise<Workspace | null>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  createCollection: (workspaceId: string, name: string) => Promise<Collection | null>;
  deleteCollection: (id: string, workspaceId: string) => Promise<boolean>;
  saveRequest: (payload: SaveRequestPayload) => Promise<Request | null>;
  updateRequest: (id: string, payload: Partial<SaveRequestPayload>, collectionId: string) => Promise<boolean>;
  deleteRequest: (id: string, collectionId: string) => Promise<boolean>;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  workspaces: [],
  collections: {},
  requests: {},
  activeWorkspaceId: null,
  expandedCollections: new Set(),
  selectedRequest: null,
  isLoading: false,

  loadWorkspaces: async () => {
    set({ isLoading: true });
    const workspaces = await dataService.getWorkspaces();

    if (workspaces.length === 0) {
      // Auto-create a default workspace on first run
      const ws = await dataService.createWorkspace('My Workspace', 'Default workspace');
      if (ws) {
        set({ workspaces: [ws], activeWorkspaceId: ws.id, isLoading: false });
        return;
      }
    }

    set({
      workspaces,
      activeWorkspaceId: get().activeWorkspaceId ?? workspaces[0]?.id ?? null,
      isLoading: false,
    });
  },

  loadCollections: async (workspaceId) => {
    const cols = await dataService.getCollections(workspaceId);
    set((state) => ({
      collections: { ...state.collections, [workspaceId]: cols },
    }));
  },

  loadRequests: async (collectionId) => {
    const reqs = await dataService.getRequests(collectionId);
    set((state) => ({
      requests: { ...state.requests, [collectionId]: reqs },
    }));
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  toggleCollection: (id) =>
    set((state) => {
      const next = new Set(state.expandedCollections);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedCollections: next };
    }),

  setSelectedRequest: (req) => set({ selectedRequest: req }),

  createWorkspace: async (name) => {
    const ws = await dataService.createWorkspace(name);
    if (ws) {
      set((state) => ({
        workspaces: [...state.workspaces, ws],
        activeWorkspaceId: state.activeWorkspaceId ?? ws.id,
      }));
    }
    return ws;
  },

  deleteWorkspace: async (id) => {
    const success = await dataService.deleteWorkspace(id);
    if (success) {
      set((state) => {
        const workspaces = state.workspaces.filter((w) => w.id !== id);
        const newCollections = { ...state.collections };
        delete newCollections[id];
        return {
          workspaces,
          collections: newCollections,
          activeWorkspaceId:
            state.activeWorkspaceId === id
              ? workspaces[0]?.id ?? null
              : state.activeWorkspaceId,
        };
      });
    }
    return success;
  },

  createCollection: async (workspaceId, name) => {
    const col = await dataService.createCollection(workspaceId, name);
    if (col) {
      set((state) => ({
        collections: {
          ...state.collections,
          [workspaceId]: [...(state.collections[workspaceId] ?? []), col],
        },
      }));
    }
    return col;
  },

  deleteCollection: async (id, workspaceId) => {
    const success = await dataService.deleteCollection(id);
    if (success) {
      set((state) => ({
        collections: {
          ...state.collections,
          [workspaceId]: (state.collections[workspaceId] ?? []).filter(
            (c) => c.id !== id
          ),
        },
      }));
    }
    return success;
  },

  saveRequest: async (payload) => {
    const req = await dataService.createRequest(payload);
    if (req) {
      set((state) => ({
        requests: {
          ...state.requests,
          [payload.collectionId]: [
            ...(state.requests[payload.collectionId] ?? []),
            req,
          ],
        },
      }));
    }
    return req;
  },

  updateRequest: async (id, payload, collectionId) => {
    const success = await dataService.updateRequest(id, payload);
    if (success) {
      // Reload requests for the collection to get fresh data
      const reqs = await dataService.getRequests(collectionId);
      set((state) => ({
        requests: { ...state.requests, [collectionId]: reqs },
      }));
    }
    return success;
  },

  deleteRequest: async (id, collectionId) => {
    const success = await dataService.deleteRequest(id);
    if (success) {
      set((state) => ({
        requests: {
          ...state.requests,
          [collectionId]: (state.requests[collectionId] ?? []).filter(
            (r) => r.id !== id
          ),
        },
      }));
    }
    return success;
  },
}));
