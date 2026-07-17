'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import type { EnvironmentRecord, EnvironmentVariable } from '@/lib/supabase-service';

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<EnvironmentRecord[]>([]);
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [creatingEnv, setCreatingEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const lastUpdatedRef = useRef<Date | null>(null);

  useEffect(() => {
    loadWorkspaceAndEnvs();
  }, []);

  const loadWorkspaceAndEnvs = async () => {
    const ws = await service.getWorkspaces();
    let wsId: string;
    if (ws.length === 0) {
      const defaultWs = await service.createWorkspace('My Workspace');
      if (!defaultWs) { toast.error('Failed to create workspace'); return; }
      wsId = defaultWs.id;
    } else {
      wsId = ws[0].id;
    }
    setWorkspaceId(wsId);
    const envs = await service.getEnvironments(wsId);
    setEnvironments(envs);
    if (envs.length > 0 && !activeEnvId) {
      setActiveEnvId(envs[0].id);
      await loadVariables(envs[0].id);
    }
  };

  const loadVariables = async (envId: string) => {
    const vars = await service.getEnvironmentVariables(envId);
    setVariables(vars);
    lastUpdatedRef.current = new Date();
  };

  const handleEnvChange = async (envId: string) => {
    setActiveEnvId(envId);
    await loadVariables(envId);
  };

  const handleCreateEnv = async () => {
    if (!newEnvName.trim() || !workspaceId) return;
    const env = await service.createEnvironment(
      workspaceId,
      newEnvName.trim(),
    );
    if (env) {
      setEnvironments((prev) => [...prev, env]);
      setActiveEnvId(env.id);
      setVariables([]);
      setCreatingEnv(false);
      setNewEnvName('');
      toast.success(`Environment "${env.name}" created`);
    }
  };

  const handleDeleteEnv = async (id: string) => {
    const success = await service.deleteEnvironment(id);
    if (success) {
      setEnvironments((prev) => prev.filter((e) => e.id !== id));
      if (activeEnvId === id) {
        const next = environments.find((e) => e.id !== id);
        setActiveEnvId(next?.id ?? null);
        if (next) await loadVariables(next.id);
        else setVariables([]);
      }
      toast.success('Environment deleted');
    }
  };

  const handleAddVariable = async () => {
    if (!activeEnvId) return;
    const v = await service.upsertEnvironmentVariable(activeEnvId, '', '', false);
    if (v) {
      setVariables((prev) => [...prev, v]);
      setSyncing(true);
      setTimeout(() => setSyncing(false), 800);
    }
  };

  const handleUpdateVariable = async (
    id: string,
    key: string,
    value: string,
    isSecret: boolean,
  ) => {
    if (!activeEnvId) return;
    const v = await service.upsertEnvironmentVariable(activeEnvId, key, value, isSecret, id);
    if (v) {
      setVariables((prev) => prev.map((x) => (x.id === id ? v : x)));
      setSyncing(true);
      setTimeout(() => setSyncing(false), 800);
    }
  };

  const handleDeleteVariable = async (id: string) => {
    const success = await service.deleteEnvironmentVariable(id);
    if (success) {
      setVariables((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const activeEnv = environments.find((e) => e.id === activeEnvId);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Environment List */}
      <aside className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 flex justify-between items-center border-b border-border">
          <h2 className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            Environments
          </h2>
          <button
            onClick={() => setCreatingEnv(true)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {environments.map((env) => (
              <button
                key={env.id}
                onClick={() => handleEnvChange(env.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors group ${
                  env.id === activeEnvId
                    ? 'bg-secondary/20 text-foreground border-r-2 border-primary'
                    : 'text-muted-foreground hover:bg-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">
                    {env.id === activeEnvId ? 'cloud_done' : 'cloud_queue'}
                  </span>
                  <span className="text-xs">{env.name}</span>
                </div>
                {env.id === activeEnvId && (
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
                )}
              </button>
            ))}
          </div>

          {creatingEnv && (
            <div className="flex gap-1 mt-2 px-2">
              <Input
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="Environment name"
                className="h-7 bg-background border-border text-xs flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateEnv()}
                autoFocus
              />
              <Button size="sm" className="h-7 w-7 p-0 bg-[#10B981]" onClick={handleCreateEnv}>
                <span className="material-symbols-outlined text-sm">check</span>
              </Button>
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Right: Variable Editor */}
      <section className="flex-1 flex flex-col bg-background">
        {activeEnv ? (
          <>
            <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/50">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-foreground">{activeEnv.name}</h2>
                <span className="px-2 py-0.5 rounded bg-[rgba(16,185,129,0.2)] text-[#10B981] text-[10px] font-bold uppercase tracking-widest border border-[rgba(16,185,129,0.3)]">
                  Active
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-7 px-3 text-xs border-border text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info('Coming in M2')}
                >
                  Duplicate
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-7 px-3 text-xs border-border text-muted-foreground hover:bg-[rgba(239,68,68,0.1)] hover:text-[#EF4444]"
                      disabled={activeEnv.name === 'Global'}
                    >
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border text-foreground">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm font-bold">Delete Environment</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-muted-foreground">
                        This will permanently delete &quot;{activeEnv.name}&quot; and all its variables.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-xs bg-transparent border-border text-muted-foreground">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="text-xs bg-[#EF4444] text-white hover:bg-[#DC2626]"
                        onClick={() => handleDeleteEnv(activeEnv.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </header>

            <ScrollArea className="flex-1 p-6">
              {/* Variables table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-1/4">Key</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-1/2">Value</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-20">Secret</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {variables.map((v) => (
                      <VariableRow
                        key={v.id}
                        variable={v}
                        onUpdate={handleUpdateVariable}
                        onDelete={handleDeleteVariable}
                      />
                    ))}
                    {variables.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center">
                          <span className="material-symbols-outlined text-muted-foreground text-3xl block mb-2">info</span>
                          <p className="text-xs text-muted-foreground">No variables yet</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Add variables for this environment</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Variable */}
              <div className="mt-4">
                <Button
                  variant="ghost"
                  onClick={handleAddVariable}
                  className="w-full h-8 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 text-xs"
                >
                  <span className="material-symbols-outlined text-sm mr-1">add_circle</span>
                  Add Variable
                </Button>
              </div>

              {/* Hint */}
              <div className="mt-8 p-6 border border-border border-dashed rounded-xl flex flex-col items-center justify-center opacity-40">
                <span className="material-symbols-outlined text-3xl mb-2 text-muted-foreground">info</span>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Environment variables are shared across your team workspace. Secrets are encrypted at rest and masked in logs.
                </p>
              </div>
            </ScrollArea>

            {/* Footer */}
            <footer className="px-6 py-3 border-t border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  {syncing ? 'Syncing...' : 'Saved'}
                </div>
                {lastUpdatedRef.current && (
                  <span className="text-muted-foreground">
                    Last updated {timeAgo(lastUpdatedRef.current.toISOString())}
                  </span>
                )}
              </div>
              <Button
                className="h-7 px-4 text-xs bg-primary hover:bg-primary/90 text-white shadow-[0_2px_10px_rgba(99,102,241,0.3)]"
                onClick={() => {
                  setSyncing(true);
                  setTimeout(() => setSyncing(false), 800);
                  toast.success('All variables synced');
                }}
              >
                Save Changes
              </Button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Create or select an environment</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Variable Row ─────────────────────────────────────────

function VariableRow({
  variable,
  onUpdate,
  onDelete,
}: {
  variable: EnvironmentVariable;
  onUpdate: (id: string, key: string, value: string, isSecret: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="group hover:bg-border/30 transition-colors border-b border-border/50">
      <td className="px-4 py-2.5">
        <Input
          defaultValue={variable.key}
          onBlur={(e) => onUpdate(variable.id, e.target.value, variable.value, variable.is_secret)}
          className="h-7 bg-transparent border-none text-xs font-mono text-primary p-0 focus:ring-0"
          placeholder="key_name"
        />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Input
            defaultValue={variable.is_secret ? '' : variable.value}
            type={variable.is_secret ? 'password' : 'text'}
            onBlur={(e) => onUpdate(variable.id, variable.key, e.target.value, variable.is_secret)}
            className={`h-7 bg-transparent border-none text-xs font-mono p-0 focus:ring-0 ${
              variable.is_secret ? 'tracking-widest text-muted-foreground' : 'text-[#10B981]'
            }`}
            placeholder={variable.is_secret ? '••••••••••••' : 'value'}
          />
          {variable.is_secret && (
            <span className="material-symbols-outlined text-[14px] text-muted-foreground">lock</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-center">
        <Switch
          checked={variable.is_secret}
          onCheckedChange={(checked) =>
            onUpdate(variable.id, variable.key, variable.value, checked)
          }
          className="data-[state=checked]:bg-primary"
        />
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          onClick={() => onDelete(variable.id)}
          className="text-muted-foreground hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </td>
    </tr>
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
  return `${Math.floor(hours / 24)}d ago`;
}