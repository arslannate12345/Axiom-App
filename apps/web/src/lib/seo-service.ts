import { getSupabaseBrowserClient } from './supabase';
import type { SeoAudit } from '@axiom/core/types';

const LOCAL_STORAGE_KEY = 'axiom_seo_audits';

export async function runSeoAudit(url: string): Promise<SeoAudit> {
  const response = await fetch(`/api/seo-audit?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'SEO audit request failed' }));
    throw new Error(errorData.error || 'Failed to execute SEO audit');
  }

  const audit: SeoAudit = await response.json();

  // Try saving to Supabase
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      const workspace_id = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

      const { data, error } = await supabase
        .from('seo_audits')
        .insert({
          user_id: userData.user.id,
          workspace_id: workspace_id,
          url: audit.url,
          score: audit.score,
          grade: audit.grade,
          findings: audit.findings,
          meta_checks: audit.meta_checks,
          heading_hierarchy: audit.heading_hierarchy,
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
    console.warn('[seo-service] Supabase persist unavailable, saving to local storage fallback.');
  }

  saveToLocalStorage(audit);
  return audit;
}

export async function getSeoHistory(): Promise<SeoAudit[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data, error } = await supabase
        .from('seo_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as SeoAudit[];
      }
    }
  } catch (err) {
    console.warn('[seo-service] Fetching history from Supabase failed, using local storage.');
  }

  return getFromLocalStorage();
}

export async function getSeoAuditById(id: string): Promise<SeoAudit | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('seo_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as SeoAudit;
    }
  } catch (err) {
    console.warn('[seo-service] Fetching audit by ID failed from Supabase, checking local storage.');
  }

  const localItems = getFromLocalStorage();
  return localItems.find((item) => item.id === id) || null;
}

// ─── LocalStorage Helpers ─────────────────────────────────────

function getFromLocalStorage(): SeoAudit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(audit: SeoAudit) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getFromLocalStorage();
    const updated = [audit, ...existing.filter((item) => item.id !== audit.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save SEO audit to localStorage:', err);
  }
}
