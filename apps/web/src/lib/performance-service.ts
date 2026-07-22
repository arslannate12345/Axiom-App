import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { PerformanceAudit, AuditStrategy, CoreWebVitals } from '@axiom/core/types';
import * as baseService from './supabase-service';

const LOCAL_STORAGE_KEY = 'axiom_performance_audits';

export async function runAudit(url: string, strategy: AuditStrategy): Promise<PerformanceAudit> {
  const supabase = getSupabaseBrowserClient();
  let workspaceId: string | null = null;
  let userId: string | null = null;

  try {
    const workspaces = await baseService.getWorkspaces();
    if (workspaces.length > 0) {
      workspaceId = workspaces[0].id;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      userId = session.user.id;
    }
  } catch (err) {
    console.warn('[performance-service] Workspaces or session lookup failed, proceeding with scan.');
  }

  // 1. Fetch PSI data from our proxy
  const res = await fetch(`/api/psi?url=${encodeURIComponent(url)}&strategy=${strategy}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to fetch PSI data' }));
    throw new Error(errorData.error || 'Failed to fetch PSI data');
  }
  const psiData = await res.json();

  // 2. Extract metrics
  const lighthouseResult = psiData.lighthouseResult || {};
  const categories = lighthouseResult.categories || {};
  const audits = lighthouseResult.audits || {};
  const loadingExperience = psiData.loadingExperience || {};

  const cruxMetrics = loadingExperience.metrics || {};
  
  const extractMetric = (cruxKey: string, lhKey: string) => {
    if (cruxMetrics[cruxKey]) {
      return cruxMetrics[cruxKey].percentile;
    }
    if (audits[lhKey]) {
      return audits[lhKey].numericValue;
    }
    return undefined;
  };

  const core_web_vitals: CoreWebVitals = {
    lcp: extractMetric('LARGEST_CONTENTFUL_PAINT_MS', 'largest-contentful-paint'),
    cls: extractMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE', 'cumulative-layout-shift') !== undefined 
         ? (extractMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE', 'cumulative-layout-shift') / 100)
         : undefined,
    fcp: extractMetric('FIRST_CONTENTFUL_PAINT_MS', 'first-contentful-paint'),
    inp: extractMetric('INTERACTION_TO_NEXT_PAINT_MS', 'interactive'),
    ttfb: extractMetric('EXPERIMENTAL_TIME_TO_FIRST_BYTE', 'server-response-time'),
  };

  const performance_score = categories.performance?.score ? Math.round(categories.performance.score * 100) : null;
  const accessibility_score = categories.accessibility?.score ? Math.round(categories.accessibility.score * 100) : null;
  const best_practices_score = categories['best-practices']?.score ? Math.round(categories['best-practices'].score * 100) : null;
  const seo_score = categories.seo?.score ? Math.round(categories.seo.score * 100) : null;

  const auditObj: PerformanceAudit = {
    id: `audit_${Date.now()}`,
    user_id: userId || 'local_user',
    workspace_id: workspaceId || 'local_workspace',
    url,
    strategy,
    performance_score,
    accessibility_score,
    best_practices_score,
    seo_score,
    core_web_vitals,
    lighthouse_result: lighthouseResult,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 3. Save to database if session is present
  if (userId && workspaceId) {
    try {
      const { data, error } = await supabase
        .from('performance_audits')
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          url,
          strategy,
          performance_score,
          accessibility_score,
          best_practices_score,
          seo_score,
          core_web_vitals,
          lighthouse_result: lighthouseResult,
        })
        .select()
        .single();

      if (!error && data) {
        saveToLocalStorage(data as PerformanceAudit);
        return data as PerformanceAudit;
      }
    } catch (err) {
      console.warn('[performance-service] Database save failed, using local storage fallback.', err);
    }
  }

  saveToLocalStorage(auditObj);
  return auditObj;
}

export async function getRecentAudits(): Promise<PerformanceAudit[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('performance_audits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data && data.length > 0) {
      // Sync local storage cache
      data.forEach((item) => saveToLocalStorage(item as PerformanceAudit));
      return data as PerformanceAudit[];
    }
  } catch (err) {
    console.warn('[performance-service] Fetching recent audits failed, returning local storage fallback.');
  }

  return getFromLocalStorage().slice(0, 20);
}

export async function getAuditHistory(): Promise<PerformanceAudit[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('performance_audits')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      data.forEach((item) => saveToLocalStorage(item as PerformanceAudit));
      return data as PerformanceAudit[];
    }
  } catch (err) {
    console.warn('[performance-service] Fetching audit history failed, returning local storage fallback.');
  }

  return getFromLocalStorage();
}

export async function getAuditById(id: string): Promise<PerformanceAudit | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('performance_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as PerformanceAudit;
    }
  } catch (err) {
    console.warn(`[performance-service] Fetching audit ${id} failed, checking local storage.`);
  }

  const localItems = getFromLocalStorage();
  return localItems.find((item) => item.id === id) || null;
}

// ─── LocalStorage Helpers ─────────────────────────────────────

function getFromLocalStorage(): PerformanceAudit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(audit: PerformanceAudit) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getFromLocalStorage();
    const updated = [audit, ...existing.filter((item) => item.id !== audit.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save performance audit to localStorage:', err);
  }
}
