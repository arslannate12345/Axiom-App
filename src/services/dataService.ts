import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';
import type {
  Workspace,
  Collection,
  Request,
  HistoryEntry,
  KeyValuePair,
  HttpMethod,
  BodyType,
  BenchmarkRun,
  BenchmarkIteration,
  Environment,
  EnvironmentVariable,
} from '../types/database';
import type { Assertion, AssertionOperator } from '../types/assertions';
import type { VariableExtraction, CollectionRun, CollectionRunStep } from '../types/runner';

const SKIP_AUTH = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

function getUserId(): string {
  if (SKIP_AUTH) return MOCK_USER_ID;
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

// ============================================================
// WORKSPACES
// ============================================================

export async function getWorkspaces(): Promise<Workspace[]> {
  if (SKIP_AUTH) {
    // In skip-auth mode, we still use Supabase if credentials are valid.
    // If not, return empty and let the store handle defaults.
  }

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch workspaces:', error.message);
    return [];
  }
  return data ?? [];
}

export async function createWorkspace(
  name: string,
  description = ''
): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, description, user_id: getUserId() })
    .select()
    .single();

  if (error) {
    console.error('Failed to create workspace:', error.message);
    return null;
  }
  return data;
}

export async function updateWorkspace(
  id: string,
  updates: { name?: string; description?: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update workspace:', error.message);
    return false;
  }
  return true;
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete workspace:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// COLLECTIONS
// ============================================================

export async function getCollections(workspaceId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch collections:', error.message);
    return [];
  }
  return data ?? [];
}

export async function createCollection(
  workspaceId: string,
  name: string,
  parentId?: string
): Promise<Collection | null> {
  const { data, error } = await supabase
    .from('collections')
    .insert({
      workspace_id: workspaceId,
      name,
      parent_id: parentId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create collection:', error.message);
    return null;
  }
  return data;
}

export async function updateCollection(
  id: string,
  updates: { name?: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('collections')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update collection:', error.message);
    return false;
  }
  return true;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete collection:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// ENVIRONMENTS
// ============================================================

export async function getEnvironments(workspaceId: string): Promise<Environment[]> {
  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Failed to fetch environments:', error.message);
    return [];
  }
  return data ?? [];
}

export async function createEnvironment(workspaceId: string, name: string): Promise<Environment | null> {
  const { data, error } = await supabase
    .from('environments')
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single();

  if (error) {
    console.error('Failed to create environment:', error.message);
    return null;
  }
  return data;
}

export async function updateEnvironment(id: string, name: string): Promise<boolean> {
  const { error } = await supabase
    .from('environments')
    .update({ name })
    .eq('id', id);
  if (error) {
    console.error('Failed to update environment:', error.message);
    return false;
  }
  return true;
}

export async function deleteEnvironment(id: string): Promise<boolean> {
  const { error } = await supabase.from('environments').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete environment:', error.message);
    return false;
  }
  return true;
}

export async function getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]> {
  const { data, error } = await supabase
    .from('environment_variables')
    .select('*')
    .eq('environment_id', environmentId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch environment variables:', error.message);
    return [];
  }
  return data ?? [];
}

export async function upsertEnvironmentVariable(
  environmentId: string,
  key: string,
  value: string,
  isSecret: boolean = false,
  id?: string
): Promise<EnvironmentVariable | null> {
  let query;
  if (id && !id.startsWith('temp-')) {
    query = supabase.from('environment_variables').update({ key, value, is_secret: isSecret }).eq('id', id).select().single();
  } else {
    query = supabase.from('environment_variables').insert({ environment_id: environmentId, key, value, is_secret: isSecret }).select().single();
  }
  const { data, error } = await query;
  if (error) {
    console.error('Failed to upsert env var:', error.message);
    return null;
  }
  return data;
}

export async function deleteEnvironmentVariable(id: string): Promise<boolean> {
  const { error } = await supabase.from('environment_variables').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete env var:', error.message);
    return false;
  }
  return true;
}


// ============================================================
// REQUESTS
// ============================================================

export async function getRequests(collectionId: string): Promise<Request[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch requests:', error.message);
    return [];
  }
  return (data ?? []).map(normalizeRequest);
}

/** Normalize Supabase JSONB fields to typed arrays */
function normalizeRequest(raw: Record<string, unknown>): Request {
  return {
    ...(raw as unknown as Request),
    headers: Array.isArray(raw.headers) ? raw.headers as KeyValuePair[] : [],
    query_params: Array.isArray(raw.query_params) ? raw.query_params as KeyValuePair[] : [],
  };
}

export interface SaveRequestPayload {
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  body: string | null;
}

export async function createRequest(
  payload: SaveRequestPayload
): Promise<Request | null> {
  const { data, error } = await supabase
    .from('requests')
    .insert({
      collection_id: payload.collectionId,
      name: payload.name,
      method: payload.method,
      url: payload.url,
      headers: payload.headers,
      query_params: payload.queryParams,
      body_type: payload.bodyType,
      body: payload.body,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create request:', error.message);
    return null;
  }
  return normalizeRequest(data as Record<string, unknown>);
}

export async function updateRequest(
  id: string,
  payload: Partial<SaveRequestPayload>
): Promise<boolean> {
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.method !== undefined) updates.method = payload.method;
  if (payload.url !== undefined) updates.url = payload.url;
  if (payload.headers !== undefined) updates.headers = payload.headers;
  if (payload.queryParams !== undefined) updates.query_params = payload.queryParams;
  if (payload.bodyType !== undefined) updates.body_type = payload.bodyType;
  if (payload.body !== undefined) updates.body = payload.body;

  const { error } = await supabase.from('requests').update(updates).eq('id', id);
  if (error) {
    console.error('Failed to update request:', error.message);
    return false;
  }
  return true;
}

export async function deleteRequest(id: string): Promise<boolean> {
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete request:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// HISTORY
// ============================================================

export interface LogExecutionPayload {
  requestId?: string;
  statusCode: number | null;
  latencyMs: number | null;
  ttfbMs: number | null;
  responseSize: number | null;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  errorMessage: string | null;
  assertionPassed?: boolean | null;
  assertionFailures?: string[];
}

export async function logExecution(
  payload: LogExecutionPayload
): Promise<HistoryEntry | null> {
  // If this is an unsaved request (no requestId), skip database logging
  // because the history table requires a valid request_id foreign key.
  if (!payload.requestId) {
    return null;
  }

  const { data, error } = await supabase
    .from('history')
    .insert({
      request_id: payload.requestId ?? null,
      user_id: getUserId(),
      status_code: payload.statusCode,
      latency_ms: payload.latencyMs,
      ttfb_ms: payload.ttfbMs,
      response_size: payload.responseSize,
      response_headers: payload.responseHeaders,
      response_body: payload.responseBody,
      error_message: payload.errorMessage,
      assertion_passed: payload.assertionPassed ?? null,
      assertion_failures: payload.assertionFailures ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log execution:', error.message);
    return null;
  }
  return data;
}

export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch history:', error.message);
    return [];
  }
  return data ?? [];
}

export async function clearHistory(): Promise<boolean> {
  const { error } = await supabase
    .from('history')
    .delete()
    .eq('user_id', getUserId());

  if (error) {
    console.error('Failed to clear history:', error.message);
    return false;
  }
  return true;
}

export async function deleteHistoryEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from('history').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete history entry:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// BENCHMARKS
// ============================================================

export async function createBenchmarkRun(
  requestId: string,
  totalIterations: number,
  batchSize: number
): Promise<BenchmarkRun | null> {
  const { data, error } = await supabase
    .from('benchmark_runs')
    .insert({
      request_id: requestId,
      user_id: getUserId(),
      total_iterations: totalIterations,
      batch_size: batchSize,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create benchmark run:', error.message);
    return null;
  }
  return data;
}

export async function insertBenchmarkIterations(
  iterations: Omit<BenchmarkIteration, 'id' | 'executed_at'>[]
): Promise<boolean> {
  const { error } = await supabase.from('benchmark_iterations').insert(iterations);

  if (error) {
    console.error('Failed to insert benchmark iterations:', error.message);
    return false;
  }
  return true;
}

export async function updateBenchmarkRunStats(
  runId: string,
  stats: Partial<BenchmarkRun>
): Promise<boolean> {
  const { error } = await supabase
    .from('benchmark_runs')
    .update(stats)
    .eq('id', runId);

  if (error) {
    console.error('Failed to update benchmark stats:', error.message);
    return false;
  }
  return true;
}

export async function getBenchmarkRunsByRequestId(
  requestId: string,
  limit = 10
): Promise<BenchmarkRun[]> {
  const { data, error } = await supabase
    .from('benchmark_runs')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch benchmark runs:', error.message);
    return [];
  }
  return data ?? [];
}

// ============================================================
// ASSERTIONS
// ============================================================

export async function getAssertions(requestId: string): Promise<Assertion[]> {
  const { data, error } = await supabase
    .from('assertions')
    .select('*')
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch assertions:', error.message);
    return [];
  }
  return data ?? [];
}

export async function createAssertion(
  requestId: string,
  field: string,
  operator: AssertionOperator,
  expectedValue: string | null
): Promise<Assertion | null> {
  // Get the next sort_order
  const existing = await getAssertions(requestId);
  const nextOrder = existing.length > 0
    ? Math.max(...existing.map((a) => a.sort_order)) + 1
    : 0;

  const { data, error } = await supabase
    .from('assertions')
    .insert({
      request_id: requestId,
      field,
      operator,
      expected_value: expectedValue,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create assertion:', error.message);
    return null;
  }
  return data;
}

export async function updateAssertion(
  id: string,
  updates: { field?: string; operator?: AssertionOperator; expected_value?: string | null }
): Promise<boolean> {
  const { error } = await supabase
    .from('assertions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update assertion:', error.message);
    return false;
  }
  return true;
}

export async function deleteAssertion(id: string): Promise<boolean> {
  const { error } = await supabase.from('assertions').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete assertion:', error.message);
    return false;
  }
  return true;
}

export async function deleteAllAssertions(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('assertions')
    .delete()
    .eq('request_id', requestId);
  if (error) {
    console.error('Failed to delete assertions:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// VARIABLE EXTRACTIONS (Phase 2)
// ============================================================

export async function getVariableExtractions(requestId: string): Promise<VariableExtraction[]> {
  const { data, error } = await supabase
    .from('variable_extractions')
    .select('*')
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to get variable extractions:', error.message);
    return [];
  }
  return data || [];
}

export async function createVariableExtraction(
  requestId: string,
  variableName: string,
  jsonPath: string
): Promise<VariableExtraction | null> {
  const { data, error } = await supabase
    .from('variable_extractions')
    .insert({
      request_id: requestId,
      variable_name: variableName,
      json_path: jsonPath,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create variable extraction:', error.message);
    return null;
  }
  return data;
}

export async function deleteAllVariableExtractions(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('variable_extractions')
    .delete()
    .eq('request_id', requestId);

  if (error) {
    console.error('Failed to delete variable extractions:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// COLLECTION RUNS (Phase 2)
// ============================================================

export async function createCollectionRun(
  collectionId: string,
  environmentId: string | null,
  totalSteps: number
): Promise<CollectionRun | null> {
  const { data, error } = await supabase
    .from('collection_runs')
    .insert({
      collection_id: collectionId,
      user_id: getUserId(),
      environment_id: environmentId === 'global-env-id' ? null : environmentId,
      total_steps: totalSteps,
      status: 'running',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create collection run:', error.message);
    return null;
  }
  return data;
}

export async function insertCollectionRunStep(
  step: Omit<CollectionRunStep, 'id' | 'executed_at'>
): Promise<boolean> {
  const { error } = await supabase.from('collection_run_steps').insert(step);

  if (error) {
    console.error('Failed to insert collection run step:', error.message);
    return false;
  }
  return true;
}

export async function updateCollectionRun(
  runId: string,
  stats: Partial<CollectionRun>
): Promise<boolean> {
  const { error } = await supabase
    .from('collection_runs')
    .update(stats)
    .eq('id', runId);

  if (error) {
    console.error('Failed to update collection run:', error.message);
    return false;
  }
  return true;
}


