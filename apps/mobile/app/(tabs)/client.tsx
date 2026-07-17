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
import { MethodSelector } from '../../src/components/MethodSelector';
import { KeyValueEditor } from '../../src/components/KeyValueEditor';
import { BodyEditor } from '../../src/components/BodyEditor';
import { ResponsePanel } from '../../src/components/ResponsePanel';
import { SaveRequestModal } from '../../src/components/SaveRequestModal';
import { executeRequest } from '../../src/services/networkService';
import { useEnvironmentStore } from '../../src/stores/environmentStore';
import { useCollectionsStore } from '../../src/stores/collectionsStore';
import { useHistoryStore } from '../../src/stores/historyStore';
import { AssertionEditor } from '../../src/components/AssertionEditor';
import { VariableExtractionEditor } from '../../src/components/VariableExtractionEditor';
import {
  getAssertions,
  createAssertion,
  deleteAllAssertions,
  getVariableExtractions,
  createVariableExtraction,
  deleteAllVariableExtractions,
} from '../../src/services/dataService';
import { evaluateAssertions } from '../../src/services/assertionEngine';
import type { HttpMethod, BodyType, KeyValuePair } from '../../src/types/database';
import type { ResponseTiming, RequestError } from '../../src/services/networkService';
import type { AssertionRow, AssertionSummary } from '../../src/types/assertions';
import type { VariableExtractionRow } from '../../src/components/VariableExtractionEditor';

type Tab = 'params' | 'headers' | 'body' | 'tests' | 'extractions';

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
  const [assertions, setAssertions] = useState<AssertionRow[]>([]);
  const [extractions, setExtractions] = useState<VariableExtractionRow[]>([]);
  const [assertionSummary, setAssertionSummary] = useState<AssertionSummary | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentStore((s) => s.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentStore((s) => s.setActiveEnvironment);
  const activeWorkspaceId = useCollectionsStore((s) => s.activeWorkspaceId);
  const selectedRequest = useCollectionsStore((s) => s.selectedRequest);
  const setSelectedRequest = useCollectionsStore((s) => s.setSelectedRequest);
  const logEntry = useHistoryStore((s) => s.logEntry);

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
      setAssertionSummary(null);

      // Load assertions for this request
      getAssertions(selectedRequest.id).then((savedAssertions) => {
        setAssertions(
          savedAssertions.map((a) => ({
            id: a.id,
            field: a.field,
            operator: a.operator,
            expected_value: a.expected_value ?? '',
            enabled: true,
          }))
        );
      });

      // Load extractions for this request
      getVariableExtractions(selectedRequest.id).then((savedExtractions) => {
        setExtractions(
          savedExtractions.map((e) => ({
            variable_name: e.variable_name,
            json_path: e.json_path,
            enabled: true,
          }))
        );
      });

      // Clear selection so navigating back doesn't reload
      setSelectedRequest(null);
    }
  }, [selectedRequest]);

  const handleResetForm = () => {
    setMethod('GET');
    setUrl('');
    setParams([]);
    setHeaders([{ key: 'Content-Type', value: 'application/json', enabled: true }]);
    setBodyType('none');
    setBody('');
    setAssertions([]);
    setExtractions([]);
    setResponse(null);
    setAssertionSummary(null);
    setCurrentRequestId(null);
  };

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

      // Evaluate assertions if any exist
      let summary: AssertionSummary | null = null;
      if (assertions.filter(a => a.enabled).length > 0) {
        summary = evaluateAssertions(result, assertions);
        setAssertionSummary(summary);
      } else {
        setAssertionSummary(null);
      }

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
        assertionPassed: summary?.passed ?? null,
        assertionFailures: summary?.failures ?? [],
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
        assertionPassed: null,
        assertionFailures: [],
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
    { key: 'tests', label: 'Tests', count: assertions.filter((a) => a.enabled).length },
    { key: 'extractions', label: 'Extractions', count: extractions.filter((e) => e.enabled).length },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Environment Picker */}
        <View style={styles.envBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.envBarContent}>
            {environments.map(env => (
              <TouchableOpacity
                key={env.id}
                style={[styles.envChip, activeEnvironmentId === env.id && styles.envChipActive]}
                onPress={() => setActiveEnvironment(env.id)}
              >
                <Ionicons 
                  name={env.name === 'Global' ? 'globe-outline' : 'server-outline'} 
                  size={14} 
                  color={activeEnvironmentId === env.id ? '#818CF8' : '#64748B'} 
                  style={{marginRight: 4}} 
                />
                <Text style={[styles.envChipText, activeEnvironmentId === env.id && styles.envChipTextActive]}>
                  {env.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionBarScroll} contentContainerStyle={styles.actionBar}>
          {currentRequestId ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                const { updateRequest } = useCollectionsStore.getState();
                const updated = await updateRequest(currentRequestId, {
                  method,
                  url,
                  headers,
                  query_params: params,
                  body_type: bodyType,
                  body: body,
                });
                if (updated) {
                  await deleteAllAssertions(currentRequestId);
                  for (const a of assertions) {
                    await createAssertion(currentRequestId, a.field, a.operator, a.expected_value);
                  }
                  await deleteAllVariableExtractions(currentRequestId);
                  for (const e of extractions) {
                    await createVariableExtraction(currentRequestId, e.variable_name, e.json_path);
                  }
                  alert('Request updated successfully');
                }
              }}
            >
              <Ionicons name="save-outline" size={16} color="#818CF8" />
              <Text style={styles.actionBtnText}>Update Request</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowSaveModal(true)}
            >
              <Ionicons name="bookmark-outline" size={16} color="#818CF8" />
              <Text style={styles.actionBtnText}>Add to Collection</Text>
            </TouchableOpacity>
          )}
          
          {currentRequestId && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowSaveModal(true)}
            >
              <Ionicons name="copy-outline" size={16} color="#818CF8" />
              <Text style={styles.actionBtnText}>Save as Copy</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={handleResetForm}>
            <Ionicons name="refresh-outline" size={16} color="#818CF8" />
            <Text style={styles.actionBtnText}>Refresh</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Tab bar */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ paddingRight: 20 }}>
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
          </ScrollView>
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
              keyPlaceholder="Header (e.g. Authorization)"
              valuePlaceholder="Value (e.g. Bearer token)"
              suggestedKeys={['Authorization', 'Content-Type', 'Accept', 'User-Agent']}
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
          {activeTab === 'tests' && (
            <AssertionEditor
              assertions={assertions}
              onChange={setAssertions}
            />
          )}
          {activeTab === 'extractions' && (
            <VariableExtractionEditor
              extractions={extractions}
              onChange={setExtractions}
            />
          )}
        </View>

        {/* Response */}
        <ResponsePanel response={response} error={error} assertionSummary={assertionSummary} />
      </ScrollView>

      {/* Save Modal */}
      <SaveRequestModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={async (id) => {
          // Save assertions associated with this request
          await deleteAllAssertions(id);
          for (const a of assertions) {
            await createAssertion(id, a.field, a.operator, a.expected_value);
          }
          // Save extractions associated with this request
          await deleteAllVariableExtractions(id);
          for (const e of extractions) {
            await createVariableExtraction(id, e.variable_name, e.json_path);
          }
          // Reset the form so the user can enter the next request in the flow
          handleResetForm();
        }}
        currentRequestId={currentRequestId}
        method={method}
        url={url}
        headers={headers}
        queryParams={params}
        bodyType={bodyType}
        body={body}
      />
    </View>
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
    padding: 16,
    paddingBottom: 40,
  },
  envBar: {
    marginBottom: 12,
  },
  envBarContent: {
    gap: 8,
  },
  envChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  envChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
  envChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  envChipTextActive: {
    color: '#818CF8',
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
  actionBarScroll: {
    marginTop: 10,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
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

