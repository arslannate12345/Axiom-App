'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import type { Workspace, Collection } from '@/lib/supabase-service';
import type { HttpMethod, BodyType, KeyValuePair } from '@/lib/api';

export interface SaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (requestId: string) => void;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  body: string | null;
}

export function SaveRequestDialog({
  open,
  onOpenChange,
  onSaved,
  method,
  url,
  headers,
  queryParams,
  bodyType,
  body,
}: SaveRequestDialogProps) {
  const [name, setName] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(extractNameFromUrl(url));
    loadData();
  }, [open, url]);

  const loadData = async () => {
    setIsCreatingWs(false);
    setIsCreatingCol(false);
    setNewWsName('');
    setNewColName('');
    const ws = await service.getWorkspaces();
    setWorkspaces(ws);
    if (ws.length > 0) {
      const existing = ws.find((w) => w.id === activeWorkspaceId);
      const targetId = existing ? existing.id : ws[0].id;
      setActiveWorkspaceId(targetId);
      const cols = await service.getCollections(targetId);
      setCollections(cols);
      if (cols.length > 0) setSelectedCollectionId(cols[0].id);
      else setSelectedCollectionId(null);
    }
  };

  const handleWorkspaceChange = async (wsId: string) => {
    setActiveWorkspaceId(wsId);
    setSelectedCollectionId(null);
    const cols = await service.getCollections(wsId);
    setCollections(cols);
    if (cols.length > 0) setSelectedCollectionId(cols[0].id);
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    const ws = await service.createWorkspace(newWsName.trim());
    if (ws) {
      setIsCreatingWs(false);
      setNewWsName('');
      setWorkspaces((prev) => [...prev, ws]);
      handleWorkspaceChange(ws.id);
      toast.success(`Workspace "${ws.name}" created`);
    }
  };

  const handleCreateCollection = async () => {
    if (!newColName.trim() || !activeWorkspaceId) return;
    const col = await service.createCollection(activeWorkspaceId, newColName.trim());
    if (col) {
      setIsCreatingCol(false);
      setNewColName('');
      setCollections((prev) => [...prev, col]);
      setSelectedCollectionId(col.id);
      toast.success(`Collection "${col.name}" created`);
    }
  };

  const handleSave = async () => {
    if (!selectedCollectionId) {
      toast.error('Please select a collection to save into');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter a request name');
      return;
    }
    setIsSaving(true);
    const req = await service.createRequest({
      collectionId: selectedCollectionId,
      name: name.trim(),
      method,
      url,
      headers,
      queryParams,
      bodyType,
      body,
    });
    setIsSaving(false);
    if (req) {
      const colName = collections.find((c) => c.id === selectedCollectionId)?.name || 'Collection';
      toast.success(`Saved to "${colName}"`);
      onSaved(req.id);
      onOpenChange(false);
    } else {
      toast.error('Failed to save request');
    }
  };

  const hasCollections = collections.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSaving) onOpenChange(false); }}>
      <DialogContent className="bg-card border-border text-foreground max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">bookmark_add</span>
            Save Request
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {/* Request Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Request Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get User Profile"
              className="h-10 bg-background border-border text-sm font-mono text-foreground focus:border-primary"
            />
          </div>

          {/* Workspace */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Workspace
            </label>
            {workspaces.length === 0 ? (
              <div>
                {isCreatingWs ? (
                  <div className="flex gap-2">
                    <Input
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      placeholder="Workspace name"
                      className="h-9 flex-1 bg-background border-border text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                    />
                    <Button size="sm" onClick={handleCreateWorkspace} disabled={!newWsName.trim()} className="h-9 px-4 text-sm bg-primary text-primary-foreground">
                      Create
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsCreatingWs(false); setNewWsName(''); }} className="h-9 text-sm text-muted-foreground">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-muted/20 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-2">No workspaces yet</p>
                    <Button onClick={() => setIsCreatingWs(true)} className="h-8 text-xs bg-primary text-primary-foreground">
                      <span className="material-symbols-outlined text-[14px] mr-1">add</span>
                      Create Workspace
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleWorkspaceChange(ws.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      ws.id === activeWorkspaceId
                        ? 'bg-primary text-white'
                        : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                    }`}
                  >
                    {ws.name}
                  </button>
                ))}
                {isCreatingWs ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      placeholder="Name"
                      className="h-7 w-28 bg-background border-border text-xs"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                    />
                    <Button size="sm" className="h-7 px-2 bg-[#10B981] text-xs" onClick={handleCreateWorkspace} disabled={!newWsName.trim()}>
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-1 text-xs text-muted-foreground" onClick={() => { setIsCreatingWs(false); setNewWsName(''); }}>
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingWs(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-primary hover:border-primary"
                  >
                    + New
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Collection */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Collection
            </label>
            {!activeWorkspaceId ? (
              <p className="text-xs text-muted-foreground py-2">Select a workspace first</p>
            ) : hasCollections ? (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setSelectedCollectionId(col.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                      col.id === selectedCollectionId
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/50'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] shrink-0 ${col.id === selectedCollectionId ? 'text-primary' : 'text-muted-foreground'}`}>
                      {col.id === selectedCollectionId ? 'folder_open' : 'folder'}
                    </span>
                    <span className="flex-1 text-left">{col.name}</span>
                    {col.id === selectedCollectionId && (
                      <span className="material-symbols-outlined text-[14px] text-primary">check</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 bg-muted/20 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">No collections in this workspace</p>
              </div>
            )}

            {isCreatingCol ? (
              <div className="flex gap-2 mt-2">
                <Input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Collection name"
                  className="h-9 flex-1 bg-background border-border text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                />
                <Button size="sm" onClick={handleCreateCollection} disabled={!newColName.trim()} className="h-9 px-4 text-sm bg-[#10B981] text-white">
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsCreatingCol(false); setNewColName(''); }} className="h-9 text-sm text-muted-foreground">
                  Cancel
                </Button>
              </div>
            ) : (
              activeWorkspaceId && (
                <Button
                  variant="ghost"
                  onClick={() => setIsCreatingCol(true)}
                  className="w-full mt-2 h-9 border border-dashed border-border text-xs font-medium text-primary hover:border-primary hover:bg-primary/5"
                >
                  <span className="material-symbols-outlined text-[14px] mr-1">create_new_folder</span>
                  New Collection
                </Button>
              )
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border shrink-0 flex-row justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-9 px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !selectedCollectionId}
            className="h-9 px-6 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSaving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving...</>
            ) : (
              <><span className="material-symbols-outlined text-[14px] mr-1">save</span>Save Request</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractNameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname.split('/').filter(Boolean).pop() || url;
  } catch {
    return url;
  }
}
