'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MethodSelector } from '@/components/client/MethodSelector';
import { KeyValueEditor } from '@/components/client/KeyValueEditor';
import { BodyEditor } from '@/components/client/BodyEditor';
import { ResponsePanel } from '@/components/client/ResponsePanel';
import { SaveRequestDialog } from '@/components/client/SaveRequestDialog';
import { executeRequest } from '@/lib/api';
import type { HttpMethod, BodyType, KeyValuePair, ResponseTiming, RequestError } from '@/lib/api';
import { toast } from 'sonner';
import { useTabsStore } from '@/stores/tabsStore';
import { AssertionsEditor } from '@/components/client/AssertionsEditor';
import { ExtractionsEditor } from '@/components/client/ExtractionsEditor';
import { runAllAssertions } from '@/lib/assertions';
import { runAllExtractions } from '@/lib/extractions';
import { MatrixRunner } from '@/components/client/MatrixRunner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SubTab = 'params' | 'headers' | 'body' | 'tests' | 'extractions';

import { METHOD_COLORS } from '@/lib/constants';

export default function ClientPage() {
  const {
    tabs,
    activeTabId,
    addTab,
    closeTab,
    setActiveTab,
    updateTab,
    markClean,
  } = useTabsStore();

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('params');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [splitPercent, setSplitPercent] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [closeConfirmTabId, setCloseConfirmTabId] = useState<string | null>(null);
  const [showMatrixDialog, setShowMatrixDialog] = useState(false);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (tabs.length === 0) {
      addTab();
      return;
    }
    if (!activeTabId || !tabs.find((t) => t.id === activeTabId)) {
      setActiveTab(tabs[0].id);
    }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('axiom-open-request');
    if (!raw) return;
    try {
      const req = JSON.parse(raw);
      addTab({
        title: req.name || req.url || 'Untitled',
        method: (req.method as HttpMethod) || 'GET',
        url: req.url || '',
        headers:
          Array.isArray(req.headers) && req.headers.length > 0
            ? req.headers
            : [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        queryParams:
          Array.isArray(req.query_params)
            ? req.query_params
            : Array.isArray(req.queryParams)
              ? req.queryParams
              : [],
        bodyType: (req.body_type as BodyType) || (req.bodyType as BodyType) || 'none',
        body: req.body || '',
      });
      sessionStorage.removeItem('axiom-open-request');
    } catch {
      sessionStorage.removeItem('axiom-open-request');
    }
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = splitPaneRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const pct = (y / rect.height) * 100;
      setSplitPercent(Math.min(90, Math.max(10, pct)));
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSend = useCallback(async () => {
    if (!activeTab) return;
    if (!activeTab.url.trim()) { toast.error('Please enter a URL'); return; }
    updateTab(activeTab.id, { isLoading: true, response: null, error: null });
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const result = await executeRequest(
        {
          method: activeTab.method,
          url: activeTab.url.trim(),
          headers: activeTab.headers || [],
          queryParams: activeTab.queryParams || [],
          bodyType: activeTab.bodyType,
          body: activeTab.body,
        },
        {},
        controller.signal,
        30000,
      );
      const ranAssertions = runAllAssertions(activeTab.assertions || [], result);
      const ranExtractions = runAllExtractions(activeTab.extractions || [], result);
      updateTab(activeTab.id, {
        response: result,
        isLoading: false,
        assertions: ranAssertions,
        extractions: ranExtractions,
      });
    } catch (err) {
      const reqError = err as RequestError;
      updateTab(activeTab.id, { error: reqError.message || 'Request failed', isLoading: false });
    } finally {
      abortControllerRef.current = null;
    }
  }, [activeTab, updateTab]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeTab) {
      updateTab(activeTab.id, { isLoading: false });
    }
  }, [activeTab, updateTab]);

  const handleReset = useCallback(() => {
    if (!activeTab) return;
    updateTab(activeTab.id, {
      method: 'GET',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      queryParams: [],
      bodyType: 'none',
      body: '',
      response: null,
      error: null,
    });
  }, [activeTab, updateTab]);

  const handleCloseTabClick = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.dirty) {
      setCloseConfirmTabId(id);
    } else {
      closeTab(id);
    }
  };

  const handleConfirmClose = () => {
    if (closeConfirmTabId) {
      closeTab(closeConfirmTabId);
      setCloseConfirmTabId(null);
    }
  };

  if (!activeTab && tabs.length > 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Select or create a tab</span>
      </div>
    );
  }

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  const activeParamsCount = (activeTab.queryParams || []).filter((p) => p.enabled && p.key.trim()).length;
  const activeHeadersCount = (activeTab.headers || []).filter((h) => h.enabled && h.key.trim()).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center bg-card border-b border-border shrink-0 h-9">
        <div className="flex items-center flex-1 overflow-x-auto min-w-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const methodColor = METHOD_COLORS[tab.method] || '#64748B';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 h-9 px-3 text-xs shrink-0 border-r border-border transition-colors ${
                  isActive
                    ? 'bg-background text-foreground border-b-2 border-b-primary'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-[12px] font-bold uppercase" style={{ color: methodColor }}>
                  {tab.method}
                </span>
                <span className="truncate max-w-[140px]">{tab.title}</span>
                {tab.dirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Unsaved changes" />
                )}
                <span
                  className="material-symbols-outlined text-[12px] hover:text-foreground shrink-0 ml-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTabClick(tab.id);
                  }}
                >
                  close
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => addTab()}
          className="shrink-0 w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="New Tab"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
      </div>

      {/* Request Bar */}
      <div className="flex items-center gap-3 p-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center border border-border rounded-lg flex-1 focus-within:border-primary transition-all overflow-hidden">
          <MethodSelector
            method={activeTab.method}
            onSelect={(m) => updateTab(activeTab.id, { method: m as HttpMethod })}
          />
          <Input
            value={activeTab.url}
            onChange={(e) => updateTab(activeTab.id, { url: e.target.value })}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 bg-transparent border-none text-xs font-mono text-foreground h-9 focus:ring-0 px-4 placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button
            onClick={activeTab.isLoading ? handleCancel : handleSend}
            className={`h-9 px-5 text-xs font-bold rounded-none ${
              activeTab.isLoading
                ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {activeTab.isLoading ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />Cancel</>
            ) : (
              <><span className="material-symbols-outlined text-[14px] mr-1">send</span>Send</>
            )}
          </Button>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg hover:bg-muted transition-colors shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-[13px] text-muted-foreground font-medium">Production</span>
          <span className="material-symbols-outlined text-[14px] text-muted-foreground">expand_more</span>
        </button>
      </div>

      {/* Action pills */}
      <div className="flex gap-2 px-3 py-1.5 bg-card/50 border-b border-border shrink-0">
        <Button
          variant="ghost"
          onClick={() => setShowSaveModal(true)}
          className="h-7 px-3 text-[12px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded hover:bg-primary/15"
        >
          <span className="material-symbols-outlined text-[14px] mr-1">bookmark_add</span>Add to Collection
        </Button>
        <Button
          variant="ghost"
          onClick={handleReset}
          className="h-7 px-3 text-[12px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded hover:bg-primary/15"
        >
          <span className="material-symbols-outlined text-[14px] mr-1">refresh</span>Reset
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowMatrixDialog(true)}
          className="h-7 px-3 text-[12px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded hover:bg-primary/15"
        >
          <span className="material-symbols-outlined text-[14px] mr-1">grid_view</span>Run Matrix
        </Button>
      </div>

      {/* Split panes — resizable */}
      <div ref={splitPaneRef} className="flex-1 flex flex-col min-h-0 relative select-none" style={isDragging ? { cursor: 'row-resize' } : undefined}>
        {/* Request builder (top) */}
        <div className="flex flex-col border-b border-border overflow-hidden" style={{ height: `${splitPercent}%`, minHeight: '120px' }}>
          <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as SubTab)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="justify-start border-b border-border bg-transparent rounded-none px-4 shrink-0 h-9">
              <TabsTrigger value="params" className="text-xs data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-muted-foreground">
                Params{activeParamsCount > 0 ? ` (${activeParamsCount})` : ''}
              </TabsTrigger>
              <TabsTrigger value="headers" className="text-xs data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-muted-foreground">
                Headers{activeHeadersCount > 0 ? ` (${activeHeadersCount})` : ''}
              </TabsTrigger>
              <TabsTrigger value="body" className="text-xs data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-muted-foreground">
                Body
              </TabsTrigger>
              <TabsTrigger value="tests" className="text-xs data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-muted-foreground">
                Tests{(activeTab.assertions || []).filter((a) => a.enabled).length > 0 ? ` (${(activeTab.assertions || []).filter((a) => a.enabled).length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="extractions" className="text-xs data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-muted-foreground">
                Extractions{(activeTab.extractions || []).filter((e) => e.enabled).length > 0 ? ` (${(activeTab.extractions || []).filter((e) => e.enabled).length})` : ''}
              </TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-auto p-4 min-h-0">
              <TabsContent value="params" className="m-0 mt-0">
                <KeyValueEditor
                  pairs={activeTab.queryParams || []}
                  onChange={(pairs) => updateTab(activeTab.id, { queryParams: pairs })}
                  keyPlaceholder="Parameter"
                  valuePlaceholder="Value"
                />
              </TabsContent>
              <TabsContent value="headers" className="m-0 mt-0">
                <KeyValueEditor
                  pairs={activeTab.headers || []}
                  onChange={(pairs) => updateTab(activeTab.id, { headers: pairs })}
                  keyPlaceholder="Header"
                  valuePlaceholder="Value"
                  suggestedKeys={['Authorization', 'Content-Type', 'Accept', 'User-Agent']}
                />
              </TabsContent>
              <TabsContent value="body" className="m-0 mt-0 h-full">
                <BodyEditor
                  bodyType={activeTab.bodyType}
                  body={activeTab.body}
                  onBodyTypeChange={(bt) => updateTab(activeTab.id, { bodyType: bt })}
                  onBodyChange={(b) => updateTab(activeTab.id, { body: b })}
                />
              </TabsContent>
              <TabsContent value="tests" className="m-0 mt-0 h-full">
                <AssertionsEditor
                  assertions={activeTab.assertions || []}
                  onChange={(assertions) => updateTab(activeTab.id, { assertions })}
                  onRun={() => {
                    if (!activeTab.response) {
                      toast.error('Send a request first to run assertions');
                      return;
                    }
                    const ran = runAllAssertions(activeTab.assertions || [], activeTab.response);
                    updateTab(activeTab.id, { assertions: ran });
                  }}
                />
              </TabsContent>
              <TabsContent value="extractions" className="m-0 mt-0 h-full">
                <ExtractionsEditor
                  extractions={activeTab.extractions || []}
                  onChange={(extractions) => updateTab(activeTab.id, { extractions })}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={handleDragStart}
          className="h-1.5 bg-border hover:bg-primary cursor-row-resize shrink-0 transition-colors group relative z-10 flex items-center justify-center"
        >
          <div className="w-8 h-0.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Response viewer (bottom) */}
        <div className="flex flex-col bg-background min-h-[120px]" style={{ height: `${100 - splitPercent}%` }}>
          <ResponsePanel
            response={activeTab.response}
            error={activeTab.error}
            isLoading={activeTab.isLoading}
          />
        </div>
      </div>

      <SaveRequestDialog
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        onSaved={(id) => {
          console.log('Saved request:', id);
          if (activeTab) markClean(activeTab.id);
        }}
        method={activeTab.method}
        url={activeTab.url}
        headers={activeTab.headers || []}
        queryParams={activeTab.queryParams || []}
        bodyType={activeTab.bodyType}
        body={activeTab.body}
      />

      {/* Close confirmation dialog */}
      <AlertDialog open={closeConfirmTabId !== null} onOpenChange={(open) => { if (!open) setCloseConfirmTabId(null); }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This tab has unsaved changes. Are you sure you want to close it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmClose}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MatrixRunner
        open={showMatrixDialog}
        onOpenChange={setShowMatrixDialog}
        method={activeTab.method}
        url={activeTab.url}
        headers={activeTab.headers || []}
        queryParams={activeTab.queryParams || []}
        bodyType={activeTab.bodyType}
        body={activeTab.body}
      />
    </div>
  );
}
