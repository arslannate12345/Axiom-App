import { getSupabaseBrowserClient } from './supabase';
import type { DatabaseAudit } from '@axiom/core/types';

const LOCAL_STORAGE_KEY = 'axiom_database_audits';

export async function runDatabaseTest(url: string): Promise<DatabaseAudit> {
  const response = await fetch(`/api/database-test?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Database health check request failed' }));
    throw new Error(errorData.error || 'Failed to execute database test audit');
  }

  const audit: DatabaseAudit = await response.json();

  // Persist to Supabase if available
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      const workspace_id = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

      const { data, error } = await supabase
        .from('database_audits')
        .insert({
          user_id: userData.user.id,
          workspace_id: workspace_id,
          url: audit.url,
          score: audit.score,
          grade: audit.grade,
          findings: audit.findings,
          endpoint_checks: audit.endpoint_checks,
          summary: audit.summary,
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
    console.warn('[database-service] Supabase persist unavailable, using local storage fallback.');
  }

  saveToLocalStorage(audit);
  return audit;
}

export async function getDatabaseHistory(): Promise<DatabaseAudit[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data, error } = await supabase
        .from('database_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as DatabaseAudit[];
      }
    }
  } catch (err) {
    console.warn('[database-service] Fetching history from Supabase failed, using local storage.');
  }

  return getFromLocalStorage();
}

export async function getDatabaseAuditById(id: string): Promise<DatabaseAudit | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('database_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as DatabaseAudit;
    }
  } catch (err) {
    console.warn('[database-service] Fetching audit by ID failed from Supabase, checking local storage.');
  }

  const localItems = getFromLocalStorage();
  return localItems.find((item) => item.id === id) || null;
}

// ─── LocalStorage Helpers ─────────────────────────────────────

function getFromLocalStorage(): DatabaseAudit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(audit: DatabaseAudit) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getFromLocalStorage();
    const updated = [audit, ...existing.filter((item) => item.id !== audit.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save database audit to localStorage:', err);
  }
}
