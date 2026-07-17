import { supabase } from './supabase';
import { Report, ReportData, ReportType } from '../types/report';

function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '';
}

export async function createReport(
  collectionId: string,
  name: string,
  reportType: ReportType,
  reportData: ReportData,
): Promise<Report | null> {
  const userId = await getUserId();
  const shareToken = generateShareToken();
  const { data, error } = await supabase.from('reports').insert({
    user_id: userId,
    collection_id: collectionId,
    name,
    share_token: shareToken,
    report_type: reportType,
    report_data: reportData as unknown as any,
  }).select().single();
  if (error) { console.error('Failed to create report:', error); return null; }
  return data;
}

export async function getReportsByCollection(collectionId: string): Promise<Report[]> {
  const { data, error } = await supabase.from('reports').select('*').eq('collection_id', collectionId).order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function getUserReports(): Promise<Report[]> {
  const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function getSharedReport(token: string): Promise<Report | null> {
  const { data, error } = await supabase.rpc('get_shared_report', { token });
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteReport(id: string): Promise<boolean> {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) { console.error(error); return false; }
  return true;
}
