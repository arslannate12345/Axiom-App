import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '../../src/components/AnimatedBackground';
import { MethodSelector } from '../../src/components/MethodSelector';
import { KeyValueEditor } from '../../src/components/KeyValueEditor';
import { BodyEditor } from '../../src/components/BodyEditor';
import { ResponsePanel } from '../../src/components/ResponsePanel';
import { SaveRequestModal } from '../../src/components/SaveRequestModal';
import { executeRequest } from '../../src/services/networkService';
import { useEnvironmentStore } from '../../src/stores/environmentStore';
import { useCollectionsStore } from '../../src/stores/collectionsStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import type { HttpMethod, BodyType, KeyValuePair } from '../../src/types/database';
import type { ResponseTiming, RequestError } from '../../src/services/networkService';

type Tab = 'params' | 'headers' | 'body';

export default function ClientScreen() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<KeyValuePair[]>([]);
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]);
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('params');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseTiming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);

  // Load selected request from collections
  const { selectedRequest, setSelectedRequest } = useCollectionsStore();
  const { logEntry } = useHistoryStore();

  useEffect(() => {
    if (selectedRequest) {
      setMethod(selectedRequest.method);
      setUrl(selectedRequest.url);
      setHeaders(
        selectedRequest.headers?.length
          ? selectedRequest.headers
          : [{ key: 'Content-Type', value: 'application/json', enabled: true }]
      );
      setParams(selectedRequest.query_params ?? []);
      setBodyType(selectedRequest.body_type);
      setBody(
        typeof selectedRequest.body === 'string'
          ? selectedRequest.body
          : selectedRequest.body
          ? JSON.stringify(selectedRequest.body)
          : ''
      );
      setCurrentRequestId(selectedRequest.id);
      setResponse(null);
      setError(null);
      // Clear selection so navigating back doesn't reload
      setSelectedRequest(null);
    }
  }, [selectedRequest]);

  const handleSend = async () => {
    if (!url.trim()) return;

    Keyboard.dismiss();
    setLoading(true);
    setResponse(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await executeRequest(
        {
          method,
          url: url.trim(),
          headers,
          queryParams: params,
          bodyType,
          body,
        },
        getActiveVariables(),
        controller.signal,
        30000
      );
      setResponse(result);

      // Log to history
      logEntry({
        requestId: currentRequestId ?? undefined,
        statusCode: result.status,
        latencyMs: result.totalTime,
        ttfbMs: result.ttfb,
        responseSize: result.size,
        responseHeaders: result.headers,
        responseBody: result.body,
        errorMessage: null,
      });
    } catch (err) {
      const reqErr = err as RequestError;
      const errorMsg = reqErr.message ?? 'Request failed';
      setError(errorMsg);

      // Log error to history
      logEntry({
        requestId: currentRequestId ?? undefined,
        statusCode: null,
        latencyMs: null,
        ttfbMs: null,
        responseSize: null,
        responseHeaders: {},
        responseBody: null,
        errorMessage: errorMsg,
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'params', label: 'Params', count: params.filter((p) => p.enabled && p.key).length },
    { key: 'headers', label: 'Headers', count: headers.filter((h) => h.enabled && h.key).length },
    { key: 'body', label: 'Body' },
  ];

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Request bar */}
          <View style={styles.requestBar}>
            <MethodSelector method={method} onSelect={setMethod} />
            <TextInput
              style={styles.urlInput}
              placeholder="https://api.example.com/endpoint"
              placeholderTextColor="#475569"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.sendBtn, loading && styles.sendBtnCancel]}
              onPress={loading ? handleCancel : handleSend}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Action bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowSaveModal(true)}
            >
              <Ionicons name="bookmark-outline" size={16} color="#818CF8" />
              <Text style={styles.actionBtnText}>Add to Collection</Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {activeTab === 'params' && (
              <KeyValueEditor
                pairs={params}
                onChange={setParams}
                keyPlaceholder="Parameter"
                valuePlaceholder="Value"
              />
            )}
            {activeTab === 'headers' && (
              <KeyValueEditor
                pairs={headers}
                onChange={setHeaders}
                keyPlaceholder="Header"
                valuePlaceholder="Value"
              />
            )}
            {activeTab === 'body' && (
              <BodyEditor
                bodyType={bodyType}
                body={body}
                onBodyTypeChange={setBodyType}
                onBodyChange={setBody}
              />
            )}
          </View>

          {/* Response */}
          <ResponsePanel response={response} error={error} />
        </ScrollView>
      </View>

      {/* Save Modal */}
      <SaveRequestModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={(id) => setCurrentRequestId(id)}
        currentRequestId={currentRequestId}
        method={method}
        url={url}
        headers={headers}
        queryParams={params}
        bodyType={bodyType}
        body={body}
      />
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  requestBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    fontFamily: 'monospace',
  },
  sendBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnCancel: {
    backgroundColor: '#EF4444',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#818CF8',
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#F1F5F9',
  },
  tabContent: {
    paddingVertical: 8,
  },
});

