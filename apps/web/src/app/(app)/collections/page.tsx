'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CollectionRunnerView } from '@/components/collections/CollectionRunnerView';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import type { Workspace, Collection, RequestRecord } from '@/lib/supabase-service';

const METHOD_COLORS: Record<string, string> = {
  GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B',
  PATCH: '#8B5CF6', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#EC4899',
};

export default function CollectionsPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [requests, setRequests] = useState<Record<string, RequestRecord[]>>({});
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'workspace' | 'collection'>('workspace');
  const [newName, setNewName] = useState('');
  const [showRunner, setShowRunner] = useState(false);

  useEffect(() => { loadWorkspaces(); }, []);

  const loadWorkspaces = async () => {
    const ws = await service.getWorkspaces();
    if (ws.length === 0) {
      const defaultWs = await service.createWorkspace('My Workspace');
      if (defaultWs) {
        setWorkspaces([defaultWs]);
        setActiveWorkspaceId(defaultWs.id);
        setCollections([]);
        return;
      }
    }
    setWorkspaces(ws);
    if (ws.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(ws[0].id);
      await loadCollections(ws[0].id);
    }
  };

  const loadCollections = async (wsId: string) => {
    const cols = await service.getCollections(wsId);
    setCollections(cols);
  };

  const handleWorkspaceChange = async (wsId: string) => {
    setActiveWorkspaceId(wsId);
    setExpandedCollections(new Set());
    setSelectedCollection(null);
    setRequests({});
    await loadCollections(wsId);
  };

  const handleToggleCollection = async (colId: string, col: Collection) => {
    setSelectedCollection(col);
    const next = new Set(expandedCollections);
    if (next.has(colId)) {
      next.delete(colId);
    } else {
      next.add(colId);
      const reqs = await service.getRequests(colId);
      setRequests((prev) => ({ ...prev, [colId]: reqs }));
    }
    setExpandedCollections(next);
  };

  const handleTapRequest = (req: RequestRecord) => {
    try { sessionStorage.setItem('axiom-open-request', JSON.stringify(req)); } catch {}
    router.push('/client');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    if (createType === 'workspace') {
      const ws = await service.createWorkspace(newName.trim());
      if (ws) {
        setWorkspaces((prev) => [...prev, ws]);
        handleWorkspaceChange(ws.id);
        toast.success('Workspace created');
      }
    } else if (createType === 'collection' && activeWorkspaceId) {
      const col = await service.createCollection(activeWorkspaceId, newName.trim());
      if (col) {
        setCollections((prev) => [...prev, col]);
        setSelectedCollection(col);
        toast.success('Collection created');
      }
    }
    setShowCreateDialog(false);
    setNewName('');
  };

  const collectionReqCount = selectedCollection ? requests[selectedCollection.id]?.length ?? 0 : 0;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Collections Tree */}
      <aside className="w-[280px] bg-[#1b1b23] border-r border-[#334155] flex flex-col shrink-0">
        {/* Workspace pills */}
        <div className="px-3 py-3 border-b border-[#334155]">
          <div className="flex gap-1 overflow-x-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleWorkspaceChange(ws.id)}
                className={`px-3 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  ws.id === activeWorkspaceId
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-[#e4e1ed]'
                }`}
              >
                {ws.name}
              </button>
            ))}
            <button
              onClick={() => { setCreateType('workspace'); setNewName(''); setShowCreateDialog(true); }}
              className="px-2 py-1 rounded text-[10px] font-semibold border border-dashed border-[#334155] text-[#6366F1] whitespace-nowrap hover:border-[#6366F1]"
            >
              + New
            </button>
          </div>
        </div>

        {/* Collections header + create */}
        <div className="px-4 py-2 border-b border-[#334155] flex justify-between items-center">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Collections</span>
          <button
            onClick={() => { setCreateType('collection'); setNewName(''); setShowCreateDialog(true); }}
            className="text-[#94A3B8] hover:text-[#e4e1ed] p-0.5 transition-colors"
            title="New Collection"
          >
            <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
          </button>
        </div>

        {/* Collections tree */}
        <ScrollArea className="flex-1 p-2">
          {collections.length === 0 && (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-[#334155] text-3xl block mb-2">folder_open</span>
              <p className="text-[10px] text-[#475569]">No collections yet</p>
            </div>
          )}
          {collections.map((col) => {
            const isExpanded = expandedCollections.has(col.id);
            const colRequests = requests[col.id] || [];
            const isSelected = selectedCollection?.id === col.id;
            return (
              <div key={col.id}>
                <button
                  onClick={() => handleToggleCollection(col.id, col)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors group ${
                    isSelected
                      ? 'bg-[rgba(99,102,241,0.1)] text-[#e4e1ed] border-r-2 border-[#6366F1]'
                      : 'text-[#94A3B8] hover:bg-[#34343d]/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0">
                    {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] shrink-0" style={{color: '#6366F1', fontVariationSettings: "'FILL' 1"}}>
                    {isExpanded ? 'folder_open' : 'folder'}
                  </span>
                  <span className="flex-1 truncate text-left">{col.name}</span>
                  {colRequests.length > 0 && (
                    <span className="text-[10px] text-[#64748B] ml-auto mr-1">{colRequests.length}</span>
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-5 border-l border-[#334155] pl-2 my-1 space-y-0.5">
                    {colRequests.map((req) => (
                      <button
                        key={req.id}
                        onClick={() => handleTapRequest(req)}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-[#94A3B8] hover:bg-[#34343d]/30 transition-colors group"
                      >
                        <span className="font-mono text-[10px] font-bold w-9 shrink-0" style={{ color: METHOD_COLORS[req.method] || '#64748B' }}>
                          {req.method}
                        </span>
                        <span className="flex-1 truncate text-left">{req.name}</span>
                      </button>
                    ))}
                    {colRequests.length === 0 && (
                      <p className="text-[10px] text-[#475569] pl-2 py-1">No requests</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </ScrollArea>
      </aside>

      {/* Right: Collection Dashboard */}
      <main className="flex-1 overflow-auto bg-[#0F172A] p-8">
        {selectedCollection ? (
          <div className="max-w-5xl mx-auto">
            <CollectionDashboard
              collection={selectedCollection}
              workspaceName={workspaces.find((w) => w.id === activeWorkspaceId)?.name}
              requestCount={collectionReqCount}
              onRunCollection={() => {
                if (collectionReqCount > 0) {
                  setShowRunner(true);
                } else {
                  toast.error('No requests to run in this collection');
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="material-symbols-outlined text-[#334155] text-5xl block mb-3">folder</span>
              <p className="text-sm text-[#475569]">Select a collection to view details</p>
            </div>
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#1E293B] border-[#334155] text-[#e4e1ed] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              New {createType === 'workspace' ? 'Workspace' : 'Collection'}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={createType === 'workspace' ? 'Workspace name' : 'Collection name'}
            className="h-8 bg-[#0F172A] border-[#334155] text-xs text-[#e4e1ed]"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-xs text-[#94A3B8]">Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#6366F1] text-white text-xs" disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collection Runner */}
      {selectedCollection && (
        <CollectionRunnerView
          open={showRunner}
          onOpenChange={setShowRunner}
          collectionName={selectedCollection.name}
          steps={(requests[selectedCollection.id] || []).map((req) => ({
            requestId: req.id,
            method: req.method,
            name: req.name,
            url: req.url,
            status: 'pending' as const,
          }))}
        />
      )}
    </div>
  );
}

// ─── Collection Dashboard ─────────────────────────────────

function CollectionDashboard({
  collection,
  workspaceName,
  requestCount,
  onRunCollection,
}: {
  collection: Collection;
  workspaceName?: string;
  requestCount: number;
  onRunCollection?: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[rgba(99,102,241,0.1)] text-[#6366F1] text-[10px] font-bold uppercase rounded border border-[rgba(99,102,241,0.2)]">
              Collection
            </span>
            {workspaceName && <span className="text-[#64748B] text-[10px]">/ {workspaceName}</span>}
          </div>
          <h2 className="text-xl font-extrabold text-[#e4e1ed] mb-1 tracking-tight">{collection.name}</h2>
          <div className="flex items-center gap-3 text-[10px] text-[#94A3B8] mt-2">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">account_tree</span>
              {requestCount} requests
            </span>
            <span className="w-1 h-1 rounded-full bg-[#334155]" />
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {timeAgo(collection.updated_at)}
            </span>
          </div>
        </div>
        <Button
          className="h-8 px-4 text-xs bg-[#6366F1] hover:bg-[#4F46E5] text-white"
          onClick={onRunCollection}
        >
          <span className="material-symbols-outlined text-[14px] mr-1">play_arrow</span>
          Run Collection
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard title="Avg Latency" value="—" subtitle="Run collection to see" icon="speed" />
        <StatCard title="Success Rate" value="—" subtitle="No data yet" icon="check_circle" color="#10B981" />
        <StatCard title="Error Count" value="0" subtitle="No errors" icon="warning" color="#EF4444" />
      </div>

      <div className="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#334155] flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-[#e4e1ed] uppercase tracking-wider">Requests</h3>
          <span className="text-[10px] text-[#64748B] font-mono">{requestCount} total</span>
        </div>
        <div className="px-5 py-8 text-center">
          {requestCount > 0 ? (
            <p className="text-xs text-[#64748B]">
              {requestCount} request{requestCount !== 1 ? 's' : ''} in this collection.
              Expand the folder above to see them.
            </p>
          ) : (
            <>
              <span className="material-symbols-outlined text-[#334155] text-3xl block mb-2">playlist_add</span>
              <p className="text-xs text-[#475569]">No requests yet</p>
              <p className="text-[10px] text-[#334155] mt-1">Save a request from the Client</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string; value: string; subtitle?: string; icon: string; color?: string;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] p-4 rounded-lg">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">{title}</span>
        <span className="material-symbols-outlined text-sm" style={{ color: color || '#6366F1' }}>{icon}</span>
      </div>
      <span className="text-xl font-bold font-mono text-[#e4e1ed]">{value}</span>
      {subtitle && <p className="text-[10px] text-[#64748B] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
