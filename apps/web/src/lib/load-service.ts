import { getSupabaseBrowserClient } from './supabase';
import type { LoadAudit, LoadTestConfig } from '@axiom/core/types';

const LOCAL_STORAGE_KEY = 'axiom_load_audits';

export async function runLoadTest(config: LoadTestConfig): Promise<LoadAudit> {
  const response = await fetch('/api/load-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Load test request failed' }));
    throw new Error(errorData.error || 'Failed to execute load test audit');
  }

  const audit: LoadAudit = await response.json();

  // Try saving to Supabase
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      const workspace_id = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

      const { data, error } = await supabase
        .from('load_audits')
        .insert({
          user_id: userData.user.id,
          workspace_id: workspace_id,
          url: audit.url,
          score: audit.score,
          grade: audit.grade,
          config: audit.config,
          summary: audit.summary,
          iterations: audit.iterations,
          status_breakdown: audit.statusBreakdown,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          ...audit,
          id: data.id,
        };
      }
    }
  } catch (err) {
    console.warn('[load-service] Supabase persist unavailable, saving to local storage fallback.');
  }

  saveToLocalStorage(audit);
  return audit;
}

export async function getLoadHistory(): Promise<LoadAudit[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data, error } = await supabase
        .from('load_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(normalizeLoadAudit);
      }
    }
  } catch (err) {
    console.warn('[load-service] Fetching history from Supabase failed, using local storage.');
  }

  return getFromLocalStorage().map(normalizeLoadAudit);
}

export async function getLoadAuditById(id: string): Promise<LoadAudit | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('load_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return normalizeLoadAudit(data);
    }
  } catch (err) {
    console.warn('[load-service] Fetching audit by ID failed from Supabase, checking local storage.');
  }

  const localItems = getFromLocalStorage();
  const item = localItems.find((i) => i.id === id);
  return item ? normalizeLoadAudit(item) : null;
}

function normalizeLoadAudit(raw: any): LoadAudit {
  return {
    ...raw,
    statusBreakdown: raw.statusBreakdown || raw.status_breakdown || {},
    iterations: raw.iterations || [],
    summary: raw.summary || {
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      avgLatencyMs: 0,
      minLatencyMs: 0,
      maxLatencyMs: 0,
      throughputRps: 0,
      errorRatePercentage: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
    },
    config: raw.config || {
      url: raw.url || '',
      method: 'GET',
      virtualUsers: 10,
      durationSeconds: 5,
      strategy: 'constant',
    },
  };
}

// ─── LocalStorage Helpers ─────────────────────────────────────

function getFromLocalStorage(): LoadAudit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(audit: LoadAudit) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getFromLocalStorage();
    const updated = [audit, ...existing.filter((item) => item.id !== audit.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save load audit to localStorage:', err);
  }
}
