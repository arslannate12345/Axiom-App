import { getSupabaseBrowserClient } from './supabase';

const supabase = () => getSupabaseBrowserClient();

// ─── Workspaces ───────────────────────────────────────────

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RequestRecord {
  id: string;
  collection_id: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  query_params: { key: string; value: string; enabled: boolean }[];
  body_type: string;
  body: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Workspaces ───────────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase()
    .from('workspaces')
    .select('*')
    .order('created_at');
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function createWorkspace(name: string, description = ''): Promise<Workspace | null> {
  const { data, error } = await supabase()
    .from('workspaces')
    .insert({ name, description })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  const { error } = await supabase().from('workspaces').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// ─── Collections ──────────────────────────────────────────

export async function getCollections(workspaceId: string): Promise<Collection[]> {
  const { data, error } = await supabase()
    .from('collections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order');
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function createCollection(workspaceId: string, name: string): Promise<Collection | null> {
  const { data, error } = await supabase()
    .from('collections')
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const { error } = await supabase().from('collections').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// ─── Requests ─────────────────────────────────────────────

export async function getRequests(collectionId: string): Promise<RequestRecord[]> {
  const { data, error } = await supabase()
    .from('requests')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order');
  if (error) { console.error(error); return []; }
  return data || [];
}

export interface SaveRequestPayload {
  collectionId: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  queryParams: { key: string; value: string; enabled: boolean }[];
  bodyType: string;
  body: string | null;
}

export async function createRequest(payload: SaveRequestPayload): Promise<RequestRecord | null> {
  const { data, error } = await supabase()
    .from('requests')
    .insert({
      collection_id: payload.collectionId,
      name: payload.name,
      method: payload.method,
      url: payload.url,
      headers: payload.headers as any,
      query_params: payload.queryParams as any,
      body_type: payload.bodyType,
      body: payload.body,
    })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function updateRequest(id: string, payload: Partial<SaveRequestPayload>): Promise<boolean> {
  const update: Record<string, any> = {};
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.method !== undefined) update.method = payload.method;
  if (payload.url !== undefined) update.url = payload.url;
  if (payload.headers !== undefined) update.headers = payload.headers as any;
  if (payload.queryParams !== undefined) update.query_params = payload.queryParams as any;
  if (payload.bodyType !== undefined) update.body_type = payload.bodyType;
  if (payload.body !== undefined) update.body = payload.body;
  const { error } = await supabase().from('requests').update(update).eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

export async function deleteRequest(id: string): Promise<boolean> {
  const { error } = await supabase().from('requests').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// ─── Environments ─────────────────────────────────────────

export interface EnvironmentRecord {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVariable {
  id: string;
  environment_id: string;
  key: string;
  value: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export async function getEnvironments(workspaceId: string): Promise<EnvironmentRecord[]> {
  const { data, error } = await supabase()
    .from('environments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at');
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function createEnvironment(workspaceId: string, name: string): Promise<EnvironmentRecord | null> {
  const { data, error } = await supabase()
    .from('environments')
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteEnvironment(id: string): Promise<boolean> {
  const { error } = await supabase().from('environments').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

export async function getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]> {
  const { data, error } = await supabase()
    .from('environment_variables')
    .select('*')
    .eq('environment_id', environmentId)
    .order('created_at');
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function upsertEnvironmentVariable(
  environmentId: string,
  key: string,
  value: string,
  isSecret = false,
  id?: string,
): Promise<EnvironmentVariable | null> {
  if (id && !id.startsWith('temp-')) {
    const { data, error } = await supabase()
      .from('environment_variables')
      .update({ key, value, is_secret: isSecret })
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    return data;
  }
  const { data, error } = await supabase()
    .from('environment_variables')
    .insert({ environment_id: environmentId, key, value, is_secret: isSecret })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteEnvironmentVariable(id: string): Promise<boolean> {
  const { error } = await supabase().from('environment_variables').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}

// ─── History ──────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  request_id: string;
  user_id: string;
  status_code: number | null;
  latency_ms: number | null;
  ttfb_ms: number | null;
  response_size: number | null;
  response_headers: Record<string, string>;
  response_body: string | null;
  error_message: string | null;
  is_benchmark: boolean;
  assertion_passed: boolean | null;
  assertion_failures: string[];
  executed_at: string;
}

export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  const { data, error } = await supabase()
    .from('history')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function clearHistory(): Promise<boolean> {
  const { error } = await supabase().from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) { console.error(error); return false; }
  return true;
}

export async function deleteHistoryEntry(id: string): Promise<boolean> {
  const { error } = await supabase().from('history').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}
