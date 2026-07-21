'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { METHOD_COLORS } from '@/lib/constants';

type DragType = 'collection' | 'request';

interface DragData {
  type: DragType;
  id: string;
  parentId: string;
}

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
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const collectionIds = useMemo(() => collections.map((c) => c.id), [collections]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveDrag(active.data.current as DragData);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as DragData;
    const overData = over.data.current as DragData;

    if (activeData.type === 'collection' && overData.type === 'collection') {
      const oldIndex = collections.findIndex((c) => c.id === activeData.id);
      const newIndex = collections.findIndex((c) => c.id === overData.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = [...collections];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setCollections(reordered);
      await service.reorderItems('collections', reordered.map((c, i) => ({ id: c.id, sort_order: i })));
    }

    if (activeData.type === 'request' && overData.type === 'request') {
      const parentId = activeData.parentId;
      const overParentId = overData.parentId;
      if (parentId !== overParentId) return;
      const list = requests[parentId];
      if (!list) return;
      const oldIndex = list.findIndex((r) => r.id === activeData.id);
      const newIndex = list.findIndex((r) => r.id === overData.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = [...list];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setRequests((prev) => ({ ...prev, [parentId]: reordered }));
      await service.reorderItems('requests', reordered.map((r, i) => ({ id: r.id, sort_order: i })));
    }
  }, [collections, requests]);

  const draggedItem = useMemo(() => {
    if (!activeDrag) return null;
    if (activeDrag.type === 'collection') {
      const col = collections.find((c) => c.id === activeDrag.id);
      return col ? { label: col.name, type: 'collection' as const } : null;
    }
    if (activeDrag.type === 'request') {
      const list = requests[activeDrag.parentId];
      const req = list?.find((r) => r.id === activeDrag.id);
      return req ? { label: req.name, method: req.method, type: 'request' as const } : null;
    }
    return null;
  }, [activeDrag, collections, requests]);

  const collectionReqCount = selectedCollection ? requests[selectedCollection.id]?.length ?? 0 : 0;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Collections Tree */}
      <aside className="w-[280px] bg-sidebar border-r border-border flex flex-col shrink-0">
        {/* Workspace pills */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleWorkspaceChange(ws.id)}
                className={`px-3 py-1 rounded text-[12px] font-semibold whitespace-nowrap transition-colors ${
                  ws.id === activeWorkspaceId
                    ? 'bg-primary text-white'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {ws.name}
              </button>
            ))}
            <button
              onClick={() => { setCreateType('workspace'); setNewName(''); setShowCreateDialog(true); }}
              className="px-2 py-1 rounded text-[12px] font-semibold border border-dashed border-border text-primary whitespace-nowrap hover:border-primary"
            >
              + New
            </button>
          </div>
        </div>

        {/* Collections header */}
        <div className="px-4 py-2 border-b border-border flex justify-between items-center">
          <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Collections</span>
          <button
            onClick={() => { setCreateType('collection'); setNewName(''); setShowCreateDialog(true); }}
            className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
            title="New Collection"
          >
            <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
          </button>
        </div>

        {/* Collections tree with DnD */}
        <ScrollArea className="flex-1 p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={collectionIds} strategy={verticalListSortingStrategy}>
              {collections.length === 0 && (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-muted-foreground text-3xl block mb-2">folder_open</span>
                  <p className="text-[12px] text-muted-foreground">No collections yet</p>
                </div>
              )}
              {collections.map((col) => (
                <SortableCollection
                  key={col.id}
                  collection={col}
                  isExpanded={expandedCollections.has(col.id)}
                  isSelected={selectedCollection?.id === col.id}
                  requests={requests[col.id] || []}
                  onToggle={() => handleToggleCollection(col.id, col)}
                  onTapRequest={handleTapRequest}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {draggedItem && (
                <div className="bg-card border border-border rounded px-3 py-1.5 text-xs text-foreground shadow-lg opacity-90 flex items-center gap-2">
                  {draggedItem.type === 'request' && draggedItem.method && (
                    <span className="font-mono text-[12px] font-bold" style={{ color: METHOD_COLORS[draggedItem.method] || '#64748B' }}>
                      {draggedItem.method}
                    </span>
                  )}
                  <span className="material-symbols-outlined text-[14px] shrink-0" style={{ color: '#6366F1' }}>
                    {draggedItem.type === 'collection' ? 'folder' : 'terminal'}
                  </span>
                  <span className="truncate max-w-[160px]">{draggedItem.label}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </ScrollArea>
      </aside>

      {/* Right: Collection Dashboard */}
      <main className="flex-1 overflow-auto bg-background p-8">
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
              <span className="material-symbols-outlined text-muted-foreground text-5xl block mb-3">folder</span>
              <p className="text-sm text-muted-foreground">Select a collection to view details</p>
            </div>
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              New {createType === 'workspace' ? 'Workspace' : 'Collection'}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={createType === 'workspace' ? 'Workspace name' : 'Collection name'}
            className="h-8 bg-background border-border text-xs text-foreground"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-xs text-muted-foreground">Cancel</Button>
            <Button onClick={handleCreate} className="bg-primary text-white text-xs" disabled={!newName.trim()}>
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

// ─── Sortable Collection Item ────────────────────────────

function SortableCollection({
  collection,
  isExpanded,
  isSelected,
  requests,
  onToggle,
  onTapRequest,
}: {
  collection: Collection;
  isExpanded: boolean;
  isSelected: boolean;
  requests: RequestRecord[];
  onToggle: () => void;
  onTapRequest: (req: RequestRecord) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: collection.id,
    data: { type: 'collection' as const, id: collection.id, parentId: '' } satisfies DragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const requestIds = useMemo(() => requests.map((r) => r.id), [requests]);

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center group">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
        </button>
        <button
          onClick={onToggle}
          className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
            isSelected
              ? 'bg-primary/10 text-foreground border-r-2 border-primary'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] shrink-0">
            {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
          </span>
          <span className="material-symbols-outlined text-[16px] shrink-0" style={{ color: '#6366F1', fontVariationSettings: "'FILL' 1" }}>
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
          <span className="flex-1 truncate text-left">{collection.name}</span>
          {requests.length > 0 && (
            <span className="text-[12px] text-muted-foreground ml-auto mr-1">{requests.length}</span>
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="ml-5 border-l border-border pl-2 my-1 space-y-0.5">
          <SortableContext items={requestIds} strategy={verticalListSortingStrategy}>
            {requests.map((req) => (
              <SortableRequest
                key={req.id}
                request={req}
                collectionId={collection.id}
                onTap={onTapRequest}
              />
            ))}
          </SortableContext>
          {requests.length === 0 && (
            <p className="text-[12px] text-muted-foreground pl-2 py-1">No requests</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sortable Request Item ───────────────────────────────

function SortableRequest({
  request,
  collectionId,
  onTap,
}: {
  request: RequestRecord;
  collectionId: string;
  onTap: (req: RequestRecord) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: request.id,
    data: { type: 'request' as const, id: request.id, parentId: collectionId } satisfies DragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group">
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <span className="material-symbols-outlined text-[12px]">drag_indicator</span>
      </button>
      <button
        onClick={() => onTap(request)}
        className="flex-1 flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="font-mono text-[12px] font-bold w-9 shrink-0" style={{ color: METHOD_COLORS[request.method] || '#64748B' }}>
          {request.method}
        </span>
        <span className="flex-1 truncate text-left">{request.name}</span>
      </button>
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
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[12px] font-bold uppercase rounded border border-primary/20">
              Collection
            </span>
            {workspaceName && <span className="text-muted-foreground text-[12px]">/ {workspaceName}</span>}
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-1 tracking-tight">{collection.name}</h2>
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">account_tree</span>
              {requestCount} requests
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {timeAgo(collection.updated_at)}
            </span>
          </div>
        </div>
        <Button
          className="h-8 px-4 text-xs bg-primary hover:bg-primary/90 text-white"
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

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex justify-between items-center">
          <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Requests</h3>
          <span className="text-[12px] text-muted-foreground font-mono">{requestCount} total</span>
        </div>
        <div className="px-5 py-8 text-center">
          {requestCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {requestCount} request{requestCount !== 1 ? 's' : ''} in this collection.
              Expand the folder above to see them.
            </p>
          ) : (
            <>
              <span className="material-symbols-outlined text-muted-foreground text-3xl block mb-2">playlist_add</span>
              <p className="text-xs text-muted-foreground">No requests yet</p>
              <p className="text-[12px] text-muted-foreground mt-1">Save a request from the Client</p>
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
    <div className="bg-card border border-border p-4 rounded-lg">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[12px] text-muted-foreground uppercase font-bold tracking-wider">{title}</span>
        <span className="material-symbols-outlined text-sm" style={{ color: color || '#6366F1' }}>{icon}</span>
      </div>
      <span className="text-xl font-bold font-mono text-foreground">{value}</span>
      {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
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
