import { getSupabaseBrowserClient } from './supabase';
import type { SecurityAudit } from '@axiom/core/types';

const LOCAL_STORAGE_KEY = 'axiom_security_audits';

export async function runSecurityScan(url: string): Promise<SecurityAudit> {
  const response = await fetch(`/api/security-scan?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Security scan request failed' }));
    throw new Error(errorData.error || 'Failed to execute web security scan');
  }

  const audit: SecurityAudit = await response.json();

  // Try saving to Supabase
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      const workspace_id = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

      const { data, error } = await supabase
        .from('security_audits')
        .insert({
          user_id: userData.user.id,
          workspace_id: workspace_id,
          url: audit.url,
          score: audit.score,
          grade: audit.grade,
          findings: audit.findings,
          header_analysis: audit.header_analysis,
          exposed_paths: audit.exposed_paths,
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
    console.warn('[security-service] Supabase persist unavailable, saving to local storage fallback.');
  }

  // Fallback to local storage
  saveToLocalStorage(audit);
  return audit;
}

export async function getSecurityHistory(): Promise<SecurityAudit[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data, error } = await supabase
        .from('security_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as SecurityAudit[];
      }
    }
  } catch (err) {
    console.warn('[security-service] Fetching history from Supabase failed, using local storage.');
  }

  return getFromLocalStorage();
}

export async function getSecurityAuditById(id: string): Promise<SecurityAudit | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('security_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as SecurityAudit;
    }
  } catch (err) {
    console.warn('[security-service] Fetching audit by ID failed from Supabase, checking local storage.');
  }

  const localItems = getFromLocalStorage();
  return localItems.find((item) => item.id === id) || null;
}

// ─── LocalStorage Helpers ─────────────────────────────────────

function getFromLocalStorage(): SecurityAudit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(audit: SecurityAudit) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getFromLocalStorage();
    const updated = [audit, ...existing.filter((item) => item.id !== audit.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save security scan to localStorage:', err);
  }
}
