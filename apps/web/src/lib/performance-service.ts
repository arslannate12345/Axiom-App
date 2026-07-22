import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { PerformanceAudit, AuditStrategy, CoreWebVitals } from '@axiom/core/types';
import * as baseService from './supabase-service';

export async function runAudit(url: string, strategy: AuditStrategy): Promise<PerformanceAudit> {
  const supabase = getSupabaseBrowserClient();
  const workspaces = await baseService.getWorkspaces();
  if (workspaces.length === 0) {
    throw new Error('No active workspace found');
  }
  const workspaceId = workspaces[0].id;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // 1. Fetch PSI data from our proxy
  const res = await fetch(`/api/psi?url=${encodeURIComponent(url)}&strategy=${strategy}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to fetch PSI data');
  }
  const psiData = await res.json();

  // 2. Extract metrics
  const lighthouseResult = psiData.lighthouseResult || {};
  const categories = lighthouseResult.categories || {};
  const audits = lighthouseResult.audits || {};
  const loadingExperience = psiData.loadingExperience || {};

  // CWV from CrUX (if available), fallback to simulated Lighthouse metrics
  const cruxMetrics = loadingExperience.metrics || {};
  
  const extractMetric = (cruxKey: string, lhKey: string) => {
    // Try CrUX first
    if (cruxMetrics[cruxKey]) {
      return cruxMetrics[cruxKey].percentile;
    }
    // Fallback to Lighthouse
    if (audits[lhKey]) {
      return audits[lhKey].numericValue;
    }
    return undefined;
  };

  const core_web_vitals: CoreWebVitals = {
    lcp: extractMetric('LARGEST_CONTENTFUL_PAINT_MS', 'largest-contentful-paint'),
    cls: extractMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE', 'cumulative-layout-shift') !== undefined 
         ? (extractMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE', 'cumulative-layout-shift') / 100) // CrUX provides CLS * 100
         : undefined,
    fcp: extractMetric('FIRST_CONTENTFUL_PAINT_MS', 'first-contentful-paint'),
    inp: extractMetric('INTERACTION_TO_NEXT_PAINT_MS', 'interactive'), // INP fallback is often TTI or Max Potential FID, but interactive is a safe baseline
    ttfb: extractMetric('EXPERIMENTAL_TIME_TO_FIRST_BYTE', 'server-response-time'),
  };

  // Convert scores (0-1) to 0-100
  const performance_score = categories.performance?.score ? Math.round(categories.performance.score * 100) : null;
  const accessibility_score = categories.accessibility?.score ? Math.round(categories.accessibility.score * 100) : null;
  const best_practices_score = categories['best-practices']?.score ? Math.round(categories['best-practices'].score * 100) : null;
  const seo_score = categories.seo?.score ? Math.round(categories.seo.score * 100) : null;

  // 3. Save to database
  const { data, error } = await supabase
    .from('performance_audits')
    .insert({
      user_id: session.user.id,
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

  if (error) {
    console.error('Failed to save audit to db', error);
    throw new Error('Failed to save audit results');
  }

  return data as PerformanceAudit;
}

export async function getRecentAudits(): Promise<PerformanceAudit[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('performance_audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch recent audits', error);
    return [];
  }

  return data as PerformanceAudit[];
}

export async function getAuditHistory(): Promise<PerformanceAudit[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('performance_audits')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch audit history', error);
    return [];
  }

  return data as PerformanceAudit[];
}

export async function getAuditById(id: string): Promise<PerformanceAudit | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('performance_audits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Failed to fetch audit ${id}`, error);
    return null;
  }

  return data as PerformanceAudit;
}
