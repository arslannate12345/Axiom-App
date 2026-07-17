'use client';

import { useState, useEffect, useCallback } from 'react';
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
  GET: '#10B981',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  PATCH: '#8B5CF6',
  DELETE: '#EF4444',
  HEAD: '#64748B',
  OPTIONS: '#EC4899',
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

  useEffect(() => {
    loadWorkspaces();
  }, []);

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

  const handleToggleCollection = async (colId: string) => {
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
    // Store in sessionStorage and navigate to client
    try {
      sessionStorage.setItem('axiom-open-request', JSON.stringify(req));
    } catch {}
    router.push('/client');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    if (createType === 'workspace') {
      const ws = await service.createWorkspace(newName.trim());
      if (ws) {
        setWorkspaces((prev) => [...prev, ws]);
        handleWorkspaceChange(ws.id);
        toast.success(`Workspace "${ws.name}" created`);
      }
    } else if (createType === 'collection' && activeWorkspaceId) {
      const col = await service.createCollection(activeWorkspaceId, newName.trim());
      if (col) {
        setCollections((prev) => [...prev, col]);
        toast.success(`Collection "${col.name}" created`);
      }
    }
    setShowCreateDialog(false);
    setNewName('');
  };

  // Stats for the selected collection: compute from its requests (simplified)
  const collectionStat = selectedCollection
    ? {
        requestCount: requests[selectedCollection.id]?.length ?? 0,
        // In a real implementation, this would query history for latency/success data
      }
    : null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Collections Tree */}
      <aside className="w-[280px] bg-[#1b1b23] border-r border-[#334155] flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-[#334155] flex justify-between items-center">
          <span className="text-xs font-bold text-[#e4e1ed] uppercase tracking-wider">Collections</span>
          <div className="flex gap-1">
            <button
              onClick={() => { setCreateType('collection'); setNewName(''); setShowCreateDialog(true); }}
              className="text-[#94A3B8] hover:text-[#e4e1ed] p-1 transition-colors"
              title="New Collection"
            >
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
            </button>
          </div>
        </div>

        {/* Workspace pills */}
        <ScrollArea className="flex-1 p-2">
          {/* Workspace pills row */}
          <div className="flex gap-2 mb-3 pb-3 border-b border-[#334155] overflow-x-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleWorkspaceChange(ws.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  ws.id === activeWorkspaceId
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-[#e4e1ed]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">briefcase</span>
                {ws.name}
              </button>
            ))}
            <button
              onClick={() => { setCreateType('workspace'); setNewName(''); setShowCreateDialog(true); }}
              className="px-3 py-1.5 rounded-full text-xs border border-dashed border-[#334155] text-[#6366F1] whitespace-nowrap hover:border-[#6366F1]"
            >
              + New
            </button>
          </div>

          {/* Collections tree */}
          <div className="space-y-1">
            {collections.map((col) => {
              const isExpanded = expandedCollections.has(col.id);
              const colRequests = requests[col.id] || [];
              return (
                <div key={col.id}>
                  {/* Collection header */}
                  <button
                    onClick={() => handleToggleCollection(col.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // Right-click context menu could go here
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors group ${
                      selectedCollection?.id === col.id
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
                    <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity text-[#64748B]">more_vert</span>
                  </button>

                  {/* Expanded requests */}
                  {isExpanded && (
                    <div className="ml-5 border-l border-[#334155] pl-2 my-1 space-y-0.5">
                      {colRequests.map((req) => (
                        <button
                          key={req.id}
                          onClick={() => {
                            setSelectedCollection(col);
                            handleTapRequest(req);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-[#94A3B8] hover:bg-[#34343d]/30 transition-colors group"
                        >
                          <span
                            className="font-mono text-[10px] font-bold w-8 shrink-0"
                            style={{ color: METHOD_COLORS[req.method] || '#64748B' }}
                          >
                            {req.method}
                          </span>
                          <span className="flex-1 truncate text-left">{req.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {collections.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-[#334155] text-4xl block mb-2">folder_open</span>
                <p className="text-xs text-[#475569]">No collections yet</p>
                <p className="text-[10px] text-[#334155] mt-1">Create one to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Right: Collection Dashboard */}
      <main className="flex-1 overflow-auto bg-[#0F172A] p-8">
        {selectedCollection || workspaces.length === 0 ? (
          <div className="max-w-6xl mx-auto">
            <CollectionDashboard
              collection={selectedCollection}
              workspaceName={workspaces.find((w) => w.id === activeWorkspaceId)?.name}
              stat={collectionStat}
              onRunCollection={() => {
                if (selectedCollection && requests[selectedCollection.id]) {
                  setShowRunner(true);
                } else {
                  toast.error('Expand the collection to load requests first');
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
  stat: _stat,
  onRunCollection,
}: {
  collection: Collection | null;
  workspaceName?: string;
  stat: { requestCount: number } | null;
  onRunCollection?: () => void;
}) {
  if (!collection) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs text-[#475569]">Select a collection</p>
      </div>
    );
  }

  const requestCount = _stat?.requestCount ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[rgba(99,102,241,0.1)] text-[#6366F1] text-[10px] font-bold uppercase rounded border border-[rgba(99,102,241,0.2)]">
              Collection
            </span>
            {workspaceName && (
              <>
                <span className="text-[#64748B] text-[10px]">/</span>
                <span className="text-[#64748B] text-[10px]">{workspaceName}</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-extrabold text-[#e4e1ed] mb-1 tracking-tight">{collection.name}</h2>
          <div className="flex items-center gap-3 text-[10px] text-[#94A3B8] mt-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">account_tree</span>
              <span>{requestCount} requests</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-[#334155]" />
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              <span>Modified {timeAgo(collection.updated_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs border-[#334155] text-[#94A3B8] hover:text-[#e4e1ed]"
            onClick={() => toast.info('Coming in M2')}
          >
            <span className="material-symbols-outlined text-[14px] mr-1">settings</span>
            Variables
          </Button>
          <Button
            className="h-8 px-4 text-xs bg-[#6366F1] hover:bg-[#4F46E5] text-white"
            onClick={onRunCollection}
          >
            <span className="material-symbols-outlined text-[14px] mr-1">play_arrow</span>
            Run Collection
          </Button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Avg Latency"
          value="—"
          subtitle="Run a benchmark to see"
          icon="speed"
          barWidth="0%"
        />
        <StatCard
          title="Success Rate"
          value="—"
          subtitle="No data yet"
          icon="check_circle"
          color="#10B981"
          barWidth="0%"
        />
        <StatCard
          title="Error Count"
          value={String(0)}
          subtitle="No errors"
          icon="warning"
          color="#EF4444"
          barWidth="0%"
        />
      </div>

      {/* Recent Executions */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#334155] flex justify-between items-center">
          <h3 className="text-[11px] font-bold text-[#e4e1ed] uppercase tracking-wider">
            Request List
          </h3>
          <span className="text-[10px] text-[#64748B] font-mono">{requestCount} total</span>
        </div>
        <div className="divide-y divide-[#334155]">
          {requestCount > 0 ? (
            <p className="text-xs text-[#64748B] px-5 py-8 text-center">
              Expand a collection above to see requests. Click one to open in the Client.
            </p>
          ) : (
            <div className="px-5 py-12 text-center">
              <span className="material-symbols-outlined text-[#334155] text-3xl block mb-2">playlist_add</span>
              <p className="text-xs text-[#475569]">No requests in this collection</p>
              <p className="text-[10px] text-[#334155] mt-1">
                Save a request from the Client workbench
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  barWidth,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color?: string;
  barWidth: string;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] p-5 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">{title}</span>
        <span className="material-symbols-outlined text-sm" style={{ color: color || '#6366F1' }}>
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold font-mono text-[#e4e1ed]">{value}</span>
        {subtitle && <span className="text-[10px] text-[#64748B] mb-1">{subtitle}</span>}
      </div>
      <div className="mt-3 h-1 w-full bg-[#334155] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: barWidth, backgroundColor: color || '#6366F1' }} />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
