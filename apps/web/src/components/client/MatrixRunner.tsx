'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { executeRequest } from '@/lib/api';
import type { HttpMethod, BodyType, KeyValuePair, ResponseTiming } from '@/lib/api';
import * as service from '@/lib/supabase-service';
import type { EnvironmentRecord, EnvironmentVariable } from '@/lib/supabase-service';

const METHOD_COLORS: Record<string, string> = {
  GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B',
  PATCH: '#8B5CF6', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#EC4899',
};

interface MatrixRun {
  envId: string;
  envName: string;
  status: 'idle' | 'running' | 'done' | 'error';
  response?: ResponseTiming;
  error?: string;
}

interface MatrixRunnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  body: string;
}

export function MatrixRunner({
  open,
  onOpenChange,
  method,
  url,
  headers,
  queryParams,
  bodyType,
  body,
}: MatrixRunnerProps) {
  const [environments, setEnvironments] = useState<EnvironmentRecord[]>([]);
  const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState<MatrixRun[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadEnvironments();
    setRuns([]);
    setExpandedRow(null);
  }, [open]);

  const loadEnvironments = async () => {
    const ws = await service.getWorkspaces();
    if (ws.length === 0) return;
    const envs = await service.getEnvironments(ws[0].id);
    setEnvironments(envs);
  };

  const loadVariables = async (envId: string): Promise<Record<string, string>> => {
    const vars = await service.getEnvironmentVariables(envId);
    const map: Record<string, string> = {};
    for (const v of vars) map[v.key] = v.value;
    return map;
  };

  const interpolate = (template: string, vars: Record<string, string>): string => {
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  };

  const handleRun = useCallback(async () => {
    if (selectedEnvIds.size === 0) return;
    setLoading(true);

    const selectedEnvs = environments.filter((e) => selectedEnvIds.has(e.id));
    const initialRuns: MatrixRun[] = selectedEnvs.map((e) => ({
      envId: e.id,
      envName: e.name,
      status: 'running',
    }));
    setRuns(initialRuns);

    const results: MatrixRun[] = [];
    for (const env of selectedEnvs) {
      try {
        const vars = await loadVariables(env.id);
        const interpolatedUrl = interpolate(url, vars);
        const interpolatedHeaders = headers
          .filter((h) => h.enabled && h.key.trim())
          .map((h) => ({ ...h, key: h.key, value: interpolate(h.value, vars) }));
        const interpolatedBody = interpolate(body, vars);

        const resp = await executeRequest(
          {
            method,
            url: interpolatedUrl,
            headers: interpolatedHeaders,
            queryParams,
            bodyType,
            body: interpolatedBody,
          },
          {},
          new AbortController().signal,
          30000,
        );
        results.push({ envId: env.id, envName: env.name, status: 'done', response: resp });
      } catch (err) {
        results.push({
          envId: env.id,
          envName: env.name,
          status: 'error',
          error: (err as Error).message || 'Request failed',
        });
      }
    }

    setRuns(results);
    setLoading(false);
  }, [selectedEnvIds, environments, url, method, headers, queryParams, bodyType, body]);

  const toggleEnv = (id: string) => {
    setSelectedEnvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasResults = runs.some((r) => r.status === 'done' || r.status === 'error');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">grid_view</span>
            Matrix Runner
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 p-6">
          {/* Request summary */}
          <div className="bg-background border border-border rounded-lg p-3 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[12px] font-bold px-1.5 py-0.5 rounded" style={{ color: METHOD_COLORS[method], backgroundColor: `${METHOD_COLORS[method]}15` }}>
                {method}
              </span>
              <span className="text-xs font-mono text-foreground truncate">{url || '(no URL)'}</span>
            </div>
          </div>

          {/* Environment selection */}
          <div className="mb-5">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Environments</h3>
            {environments.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No environments found. Create one in Settings.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {environments.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => toggleEnv(env.id)}
                    className={`px-3 py-1.5 rounded text-[12px] font-semibold border transition-colors ${
                      selectedEnvIds.has(env.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {env.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          <Button
            onClick={handleRun}
            disabled={selectedEnvIds.size === 0 || loading}
            className="h-8 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground mb-5"
          >
            {loading ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />Running...</>
            ) : (
              <><span className="material-symbols-outlined text-[14px] mr-1">play_arrow</span>Run ({selectedEnvIds.size} envs)</>
            )}
          </Button>

          {/* Results grid */}
          {hasResults && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Environment</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Latency</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Size</th>
                      <th className="text-left px-4 py-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">Body Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const isExpanded = expandedRow === run.envId;
                      return (
                        <>
                          <tr
                            key={run.envId}
                            className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
                            onClick={() => setExpandedRow(isExpanded ? null : run.envId)}
                          >
                            <td className="px-4 py-2.5 font-medium">{run.envName}</td>
                            <td className="px-4 py-2.5">
                              {run.status === 'running' && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <div className="w-2.5 h-2.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                                  Running
                                </span>
                              )}
                              {run.status === 'done' && run.response && (
                                <span
                                  className="font-mono font-bold"
                                  style={{ color: run.response.status < 400 ? '#10B981' : '#EF4444' }}
                                >
                                  {run.response.status} {run.response.statusText}
                                </span>
                              )}
                              {run.status === 'error' && (
                                <span className="text-[#EF4444] text-[12px]">{run.error}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              {run.response ? `${run.response.totalTime}ms` : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              {run.response ? formatBytes(run.response.size) : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground max-w-[300px] truncate">
                              {run.response ? run.response.body.slice(0, 80) : '—'}
                            </td>
                          </tr>
                          {isExpanded && run.response && (
                            <tr key={`${run.envId}-body`} className="bg-background">
                              <td colSpan={5} className="px-4 py-3">
                                <div className="max-h-[200px] overflow-auto">
                                  <pre className="text-[12px] font-mono text-foreground whitespace-pre-wrap break-all">
                                    {run.response.body}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
