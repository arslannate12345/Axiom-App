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

type SubTab = 'params' | 'headers' | 'body' | 'tests' | 'extractions';

export default function ClientPage() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]);
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>([]);
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ResponseTiming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('params');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('axiom-open-request');
    if (!raw) return;
    try {
      const req = JSON.parse(raw);
      setMethod((req.method as HttpMethod) || 'GET');
      setUrl(req.url || '');
      setHeaders(
        Array.isArray(req.headers) && req.headers.length > 0
          ? req.headers
          : [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      );
      setQueryParams(
        Array.isArray(req.query_params) ? req.query_params : Array.isArray(req.queryParams) ? req.queryParams : [],
      );
      setBodyType((req.body_type as BodyType) || (req.bodyType as BodyType) || 'none');
      setBody(req.body || '');
      sessionStorage.removeItem('axiom-open-request');
    } catch {
      sessionStorage.removeItem('axiom-open-request');
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!url.trim()) { toast.error('Please enter a URL'); return; }
    setIsLoading(true);
    setResponse(null);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const result = await executeRequest(
        { method, url: url.trim(), headers, queryParams, bodyType, body },
        {}, controller.signal, 30000,
      );
      setResponse(result);
    } catch (err) {
      const reqError = err as RequestError;
      setError(reqError.message || 'Request failed');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [method, url, headers, queryParams, bodyType, body]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleReset = useCallback(() => {
    setMethod('GET'); setUrl('');
    setHeaders([{ key: 'Content-Type', value: 'application/json', enabled: true }]);
    setQueryParams([]); setBodyType('none'); setBody('');
    setResponse(null); setError(null);
  }, []);

  const activeParamsCount = queryParams.filter((p) => p.enabled && p.key.trim()).length;
  const activeHeadersCount = headers.filter((h) => h.enabled && h.key.trim()).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Request Bar */}
      <div className="flex items-center gap-3 p-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center border border-border rounded-lg flex-1 focus-within:border-primary transition-all overflow-hidden">
          <MethodSelector method={method} onSelect={(m) => setMethod(m as HttpMethod)} />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 bg-transparent border-none text-xs font-mono text-foreground h-9 focus:ring-0 px-4 placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button
            onClick={isLoading ? handleCancel : handleSend}
            className={`h-9 px-5 text-xs font-bold rounded-none ${
              isLoading ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {isLoading ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />Cancel</>
            ) : (
              <><span className="material-symbols-outlined text-[14px] mr-1">send</span>Send</>
            )}
          </Button>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg hover:bg-muted transition-colors shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-[11px] text-muted-foreground font-medium">Production</span>
          <span className="material-symbols-outlined text-[14px] text-muted-foreground">expand_more</span>
        </button>
      </div>

      {/* Action pills */}
      <div className="flex gap-2 px-3 py-1.5 bg-card/50 border-b border-border shrink-0">
        <Button variant="ghost" onClick={() => setShowSaveModal(true)}
          className="h-7 px-3 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded hover:bg-primary/15">
          <span className="material-symbols-outlined text-[14px] mr-1">bookmark_add</span>Add to Collection
        </Button>
        <Button variant="ghost" onClick={handleReset}
          className="h-7 px-3 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded hover:bg-primary/15">
          <span className="material-symbols-outlined text-[14px] mr-1">refresh</span>Reset
        </Button>
      </div>

      {/* Split panes */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Request builder (top) — capped at 45% */}
        <div className="flex-1 flex flex-col min-h-[140px] max-h-[45%] border-b border-border">
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
              <TabsTrigger value="tests" disabled className="text-xs rounded-none px-3 py-2 text-muted-foreground cursor-not-allowed">
                Tests <span className="text-[9px] ml-0.5">M2</span>
              </TabsTrigger>
              <TabsTrigger value="extractions" disabled className="text-xs rounded-none px-3 py-2 text-muted-foreground cursor-not-allowed">
                Extractions <span className="text-[9px] ml-0.5">M2</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-4 min-h-0">
              <TabsContent value="params" className="m-0 mt-0">
                <KeyValueEditor pairs={queryParams} onChange={setQueryParams} keyPlaceholder="Parameter" valuePlaceholder="Value" />
              </TabsContent>
              <TabsContent value="headers" className="m-0 mt-0">
                <KeyValueEditor pairs={headers} onChange={setHeaders} keyPlaceholder="Header" valuePlaceholder="Value"
                  suggestedKeys={['Authorization', 'Content-Type', 'Accept', 'User-Agent']} />
              </TabsContent>
              <TabsContent value="body" className="m-0 mt-0 h-full">
                <BodyEditor bodyType={bodyType} body={body} onBodyTypeChange={setBodyType} onBodyChange={setBody} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Response viewer (bottom) — gets 2x the flex space */}
        <div className="flex-[2] flex flex-col min-h-[250px] bg-background">
          <ResponsePanel response={response} error={error} isLoading={isLoading} />
        </div>
      </div>

      <SaveRequestDialog
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        onSaved={(id) => console.log('Saved request:', id)}
        method={method}
        url={url}
        headers={headers}
        queryParams={queryParams}
        bodyType={bodyType}
        body={body}
      />
    </div>
  );
}