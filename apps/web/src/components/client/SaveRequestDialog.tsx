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
import { ScrollArea } from '@/components/ui/scroll-area';
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
    const ws = await service.getWorkspaces();
    setWorkspaces(ws);
    if (ws.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(ws[0].id);
      const cols = await service.getCollections(ws[0].id);
      setCollections(cols);
    }
  };

  const handleWorkspaceChange = async (wsId: string) => {
    setActiveWorkspaceId(wsId);
    setSelectedCollectionId(null);
    const cols = await service.getCollections(wsId);
    setCollections(cols);
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
    if (!selectedCollectionId || !name.trim()) {
      toast.error('Please select a collection and enter a name');
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
      toast.success(`Saved to "${collections.find((c) => c.id === selectedCollectionId)?.name}"`);
      onSaved(req.id);
      onOpenChange(false);
    } else {
      toast.error('Failed to save request');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Add Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Name */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Request Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Login Endpoint"
              autoFocus
              className="h-8 bg-background border-border text-xs font-mono text-foreground focus:border-primary"
            />
          </div>

          {/* Workspace */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Workspace
            </label>
            <div className="flex flex-wrap gap-2">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceChange(ws.id)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                    ws.id === activeWorkspaceId
                      ? 'bg-primary text-white'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ws.name}
                </button>
              ))}
              {isCreatingWs ? (
                <div className="flex gap-1">
                  <Input
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="Name"
                    className="h-7 w-28 bg-background border-border text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                  />
                  <Button size="sm" className="h-7 w-7 p-0 bg-[#10B981]" onClick={handleCreateWorkspace}>
                    <span className="material-symbols-outlined text-sm">check</span>
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingWs(true)}
                  className="px-3 py-1.5 rounded-full text-xs border border-dashed border-border text-primary hover:border-primary"
                >
                  + New
                </button>
              )}
            </div>
          </div>

          {/* Collection */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Collection
            </label>
            <ScrollArea className="max-h-36">
              <div className="space-y-1">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setSelectedCollectionId(col.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs border transition-colors ${
                      col.id === selectedCollectionId
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm text-muted-foreground">folder</span>
                    {col.name}
                  </button>
                ))}
              </div>
            </ScrollArea>
            {isCreatingCol ? (
              <div className="flex gap-1 mt-2">
                <Input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Collection name"
                  className="h-7 flex-1 bg-background border-border text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                />
                <Button size="sm" className="h-7 w-7 p-0 bg-[#10B981]" onClick={handleCreateCollection}>
                  <span className="material-symbols-outlined text-sm">check</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsCreatingCol(true)}
                className="w-full mt-2 h-7 border border-dashed border-border text-primary text-xs hover:border-primary"
              >
                <span className="material-symbols-outlined text-sm mr-1">add</span>
                New Collection
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !selectedCollectionId}
            className="bg-primary hover:bg-primary/90 text-white text-xs"
          >
            {isSaving ? 'Saving...' : 'Save'}
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