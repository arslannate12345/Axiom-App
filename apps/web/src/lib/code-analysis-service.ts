import { getSupabaseBrowserClient } from './supabase';
import type { CodeAnalysisAudit } from '@axiom/core/types';

const LOCAL_STORAGE_KEY = 'axiom_code_analysis_audits';

export interface CodeAnalysisParams {
  inputMode: 'paste' | 'github';
  code?: string;
  language?: string;
  filename?: string;
  githubUrl?: string;
}

export async function runCodeAnalysis(params: CodeAnalysisParams): Promise<CodeAnalysisAudit> {
  const response = await fetch('/api/code-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Code analysis request failed' }));
    throw new Error(errorData.error || 'Failed to execute static code analysis');
  }

  const audit: CodeAnalysisAudit = await response.json();

  // Save to Supabase with localStorage fallback
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      const workspace_id = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

      const { data, error } = await supabase
        .from('code_analysis_audits')
        .insert({
          user_id: userData.user.id,
          workspace_id: workspace_id,
          input_mode: audit.input_mode || params.inputMode,
          github_url: audit.github_url || params.githubUrl,
          language: audit.language,
          filename: audit.filename,
          score: audit.score,
          grade: audit.grade,
          findings: audit.findings,
          summary: audit.summary,
          category_breakdown: audit.category_breakdown,
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
    console.warn('[code-analysis-service] Supabase persist unavailable, using localStorage fallback.');
  }

  saveToLocalStorage(audit);
  return audit;
}

export async function getCodeAnalysisHistory(): Promise<CodeAnalysisAudit[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user) {
      const { data, error } = await supabase
        .from('code_analysis_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as CodeAnalysisAudit[];
      }
    }
  } catch (err) {
    console.warn('[code-analysis-service] Fetching history from Supabase failed, using localStorage.');
  }

  return getFromLocalStorage();
}

export async function getCodeAnalysisById(id: string): Promise<CodeAnalysisAudit | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('code_analysis_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as CodeAnalysisAudit;
    }
  } catch (err) {
    console.warn('[code-analysis-service] Fetching audit by ID failed from Supabase, checking local storage.');
  }

  const localItems = getFromLocalStorage();
  return localItems.find((item) => item.id === id) || null;
}

// ─── LocalStorage Helpers ─────────────────────────────────────

function getFromLocalStorage(): CodeAnalysisAudit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(audit: CodeAnalysisAudit) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getFromLocalStorage();
    const updated = [audit, ...existing.filter((item) => item.id !== audit.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save code analysis audit to localStorage:', err);
  }
}
