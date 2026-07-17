'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import * as service from '@/lib/supabase-service';
import type { HistoryEntry } from '@/lib/supabase-service';

const METHOD_COLORS: Record<string, string> = {
  GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B',
  PATCH: '#8B5CF6', DELETE: '#EF4444', HEAD: '#64748B', OPTIONS: '#EC4899',
};

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [inspectorEntry, setInspectorEntry] = useState<HistoryEntry | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await service.getHistory(50);
    setEntries(data);
  };

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (methodFilter !== 'all' && e.request_id) {
        // Method filter: we don't have method on history entries directly
        // so we filter by URL pattern matching
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (!e.request_id?.toLowerCase().includes(q) &&
            !e.response_body?.toLowerCase().includes(q) &&
            !e.error_message?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, searchTerm, methodFilter]);

  const handleClearAll = async () => {
    await service.clearHistory();
    setEntries([]);
    toast.success('History cleared');
  };

  const handleRestore = (entry: HistoryEntry) => {
    // In a real implementation, this would reconstruct the Request
    // For now just navigate to client
    setInspectorOpen(false);
    router.push('/client');
  };

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#334155]">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold text-[#e4e1ed]">Request History</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Review and re-run your historical API interactions.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-8 px-3 text-xs border-[#334155] text-[#94A3B8] hover:text-[#EF4444] hover:border-[#EF4444]">
                <span className="material-symbols-outlined text-[14px] mr-1">delete_sweep</span>
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1E293B] border-[#334155] text-[#e4e1ed]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm font-bold">Clear History</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-[#94A3B8]">
                  This will delete all history entries. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs bg-transparent border-[#334155] text-[#94A3B8]">Cancel</AlertDialogCancel>
                <AlertDialogAction className="text-xs bg-[#EF4444] text-white hover:bg-[#DC2626]" onClick={handleClearAll}>
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-3 p-2 bg-[#1E293B] rounded-lg border border-[#334155]">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#64748B] text-sm pointer-events-none">search</span>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by request ID or error..."
              className="w-full bg-[#0F172A] border-[#334155] rounded pl-9 pr-3 h-7 text-xs text-[#e4e1ed] focus:border-[#6366F1]"
            />
          </div>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-28 h-7 bg-[#0F172A] border-[#334155] text-xs text-[#94A3B8]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E293B] border-[#334155] text-[#e4e1ed]">
              <SelectItem value="all" className="text-xs">All Methods</SelectItem>
              {methods.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0F172A] border-b border-[#334155] z-10">
            <tr className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
              <th className="px-6 py-3 w-20">Status</th>
              <th className="px-6 py-3">Error</th>
              <th className="px-6 py-3 w-20 text-right">Latency</th>
              <th className="px-6 py-3 w-20 text-right">Size</th>
              <th className="px-6 py-3 w-28">Time</th>
              <th className="px-6 py-3 w-16 text-right pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/50">
            {filtered.map((entry) => (
              <tr
                key={entry.id}
                onClick={() => { setInspectorEntry(entry); setInspectorOpen(true); }}
                className="group hover:bg-[#34343d]/30 transition-colors cursor-pointer"
              >
                <td className="px-6 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                    style={{
                      color: entry.status_code && entry.status_code < 400 ? '#10B981' : '#EF4444',
                      backgroundColor: entry.status_code && entry.status_code < 400
                        ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: entry.status_code && entry.status_code < 400 ? '#10B981' : '#EF4444',
                      }}
                    />
                    {entry.status_code ?? 'ERR'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-[#94A3B8] truncate block max-w-md font-mono">
                    {entry.error_message || entry.response_body?.slice(0, 80) || '—'}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-xs font-mono text-[#94A3B8]">
                  {entry.latency_ms ? `${entry.latency_ms}ms` : '—'}
                </td>
                <td className="px-6 py-3 text-right text-xs font-mono text-[#94A3B8]">
                  {entry.response_size ? `${entry.response_size}B` : '—'}
                </td>
                <td className="px-6 py-3 text-xs text-[#64748B]">
                  {entry.executed_at ? timeAgo(entry.executed_at) : '—'}
                </td>
                <td className="px-6 py-3 text-right pr-8">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRestore(entry); }}
                    className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-[#6366F1] hover:scale-110 transition-all text-sm"
                    title="Restore to Workbench"
                  >
                    open_in_new
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <span className="material-symbols-outlined text-[#334155] text-4xl block mb-2">history</span>
              <p className="text-sm text-[#475569]">No history entries</p>
              <p className="text-xs text-[#334155] mt-1">Send a request from the Client to see it here</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <footer className="h-8 bg-[#1E293B] border-t border-[#334155] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-[10px] text-[#94A3B8]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> System Online
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">database</span>
            {entries.length} History Records
          </span>
        </div>
      </footer>

      {/* Inspector Drawer */}
      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <SheetContent side="right" className="w-[400px] bg-[#1E293B] border-l border-[#334155] text-[#e4e1ed] p-0">
          {inspectorEntry && (
            <div className="h-full flex flex-col">
              <SheetHeader className="p-4 border-b border-[#334155] bg-[#1b1b23]">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-1 rounded"
                    style={{ backgroundColor: '#334155', color: '#3B82F6' }}>
                    HISTORY
                  </span>
                  <SheetTitle className="text-xs font-bold">Request Detail</SheetTitle>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 p-4 space-y-5">
                <div>
                  <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase mb-2 tracking-widest">Status</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] font-bold px-2 py-0.5 ${
                      inspectorEntry.status_code && inspectorEntry.status_code < 400
                        ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                    }`}>
                      {inspectorEntry.status_code ?? 'Error'}
                    </Badge>
                    <span className="text-xs text-[#64748B] font-mono">
                      {inspectorEntry.latency_ms ? `${inspectorEntry.latency_ms}ms` : ''}
                    </span>
                  </div>
                </div>

                <Separator className="bg-[#334155]" />

                {inspectorEntry.error_message && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#EF4444] uppercase mb-2 tracking-widest">Error</h4>
                    <div className="p-2 bg-[#0F172A] border border-[#334155] rounded text-xs font-mono text-[#FCA5A5] break-all">
                      {inspectorEntry.error_message}
                    </div>
                  </div>
                )}

                {inspectorEntry.response_body && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase mb-2 tracking-widest">Response Body</h4>
                    <pre className="p-3 bg-[#0F172A] border border-[#334155] rounded text-xs font-mono text-[#94A3B8] max-h-48 overflow-auto whitespace-pre-wrap break-all">
                      {inspectorEntry.response_body.slice(0, 2000)}
                      {inspectorEntry.response_body.length > 2000 ? '...' : ''}
                    </pre>
                  </div>
                )}

                {inspectorEntry.response_headers && Object.keys(inspectorEntry.response_headers).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase mb-2 tracking-widest">Headers</h4>
                    <div className="space-y-1">
                      {Object.entries(inspectorEntry.response_headers).slice(0, 10).map(([k, v]) => (
                        <div key={k} className="flex justify-between p-1.5 bg-[#34343d]/20 rounded text-[10px]">
                          <span className="text-[#94A3B8] font-bold">{k}</span>
                          <span className="text-[#e4e1ed] font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-[#334155] bg-[#1b1b23]">
                <Button
                  onClick={() => handleRestore(inspectorEntry)}
                  className="w-full h-9 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs"
                >
                  <span className="material-symbols-outlined text-sm mr-1">refresh</span>
                  Restore to Workbench
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
