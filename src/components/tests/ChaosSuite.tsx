import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { runChaosTest, ChaosConfig, ChaosResult } from '../../services/chaosService';
import type { Request } from '../../types/database';

export function ChaosSuite() {
  const requests = useCollectionsStore((s) => s.requests);
  const activeWorkspaceId = useCollectionsStore((s) => s.activeWorkspaceId);
  const collections = useCollectionsStore((s) => s.collections);
  const loadCollections = useCollectionsStore((s) => s.loadCollections);
  const loadRequests = useCollectionsStore((s) => s.loadRequests);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  
  const [iterations, setIterations] = useState('20');
  const [minLatency, setMinLatency] = useState('0');
  const [maxLatency, setMaxLatency] = useState('3000');
  const [dropProb, setDropProb] = useState('10'); // %

  const [isRunning, setIsRunning] = useState(false);
  const [progressStr, setProgressStr] = useState<string>('');
  const [results, setResults] = useState<ChaosResult[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load all requests for the active workspace
  useEffect(() => {
    if (activeWorkspaceId) {
      loadCollections(activeWorkspaceId).then(() => {
        const workspaceCollections = collections[activeWorkspaceId] || [];
        workspaceCollections.forEach(c => {
          loadRequests(c.id);
        });
      });
    }
  }, [activeWorkspaceId]);

  const allRequests = useMemo(() => {
    return Object.values(requests).flat();
  }, [requests]);

  const handleRunTest = async () => {
    if (!selectedRequest) return;
    
    const iters = parseInt(iterations, 10);
    const minL = parseInt(minLatency, 10);
    const maxL = parseInt(maxLatency, 10);
    const drop = parseInt(dropProb, 10);

    if (isNaN(iters) || iters <= 0) return alert('Please enter a valid number of iterations.');
    if (isNaN(minL) || minL < 0) return alert('Invalid Min Latency');
    if (isNaN(maxL) || maxL < minL) return alert('Invalid Max Latency');
    if (isNaN(drop) || drop < 0 || drop > 100) return alert('Drop Probability must be between 0 and 100');
    
    setIsRunning(true);
    setResults(null);
    setProgressStr('Initializing...');
    abortControllerRef.current = new AbortController();

    const config: ChaosConfig = {
      iterations: iters,
      minLatencyMs: minL,
      maxLatencyMs: maxL,
      dropProbability: drop / 100,
    };

    try {
      const vars = getActiveVariables();
      const res = await runChaosTest(
        selectedRequest,
        vars,
        config,
        (current, total, result) => {
          setProgressStr(`Iteration ${current}/${total}...`);
        },
        abortControllerRef.current.signal
      );
      if (!abortControllerRef.current.signal.aborted) {
        setResults(res);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        alert('Chaos testing failed: ' + (err as Error).message);
      }
    } finally {
      setIsRunning(false);
      setProgressStr('');
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setProgressStr('Cancelled');
  };

  const getStatusBadge = (res: ChaosResult) => {
    if (res.status === 'passed') return <View style={[styles.badge, styles.badgePassed]}><Text style={styles.badgeTextPassed}>PASSED</Text></View>;
    if (res.status === 'dropped') return <View style={[styles.badge, styles.badgeDropped]}><Text style={styles.badgeTextDropped}>DROPPED</Text></View>;
    return <View style={[styles.badge, styles.badgeFailed]}><Text style={styles.badgeTextFailed}>FAILED</Text></View>;
  };

  const summary = useMemo(() => {
    if (!results) return null;
    let passed = 0, dropped = 0, failed = 0;
    let totalLatency = 0;
    results.forEach(r => {
      if (r.status === 'passed') passed++;
      if (r.status === 'dropped') dropped++;
      if (r.status === 'failed') failed++;
      totalLatency += r.injectedLatencyMs;
    });
    return {
      passed, dropped, failed, total: results.length,
      avgLatency: results.length ? Math.round(totalLatency / results.length) : 0
    };
  }, [results]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Target Request Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Target Request</Text>
          <TouchableOpacity
            style={styles.requestSelectorBtn}
            onPress={() => setShowSelector(true)}
            disabled={isRunning}
          >
            <Text style={selectedRequest ? styles.requestSelectorText : styles.requestSelectorPlaceholder}>
              {selectedRequest ? `${selectedRequest.method} ${selectedRequest.name || selectedRequest.url}` : 'Select a saved request...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Configuration */}
        {selectedRequest && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chaos Configuration</Text>
            
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Iterations</Text>
                <TextInput
                  style={styles.textInput}
                  value={iterations}
                  onChangeText={setIterations}
                  keyboardType="numeric"
                  editable={!isRunning}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Drop Prob. (%)</Text>
                <TextInput
                  style={styles.textInput}
                  value={dropProb}
                  onChangeText={setDropProb}
                  keyboardType="numeric"
                  editable={!isRunning}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Min Latency (ms)</Text>
                <TextInput
                  style={styles.textInput}
                  value={minLatency}
                  onChangeText={setMinLatency}
                  keyboardType="numeric"
                  editable={!isRunning}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Max Latency (ms)</Text>
                <TextInput
                  style={styles.textInput}
                  value={maxLatency}
                  onChangeText={setMaxLatency}
                  keyboardType="numeric"
                  editable={!isRunning}
                />
              </View>
            </View>
          </View>
        )}

        {/* Action Button */}
        {selectedRequest && (
          <View style={styles.actionContainer}>
            {isRunning ? (
              <View style={styles.runningContainer}>
                <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 8 }} />
                <Text style={styles.runningText}>{progressStr}</Text>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.runBtn} onPress={handleRunTest}>
                <Ionicons name="play" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.runBtnText}>START CHAOS</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Summary Dashboard */}
        {summary && !isRunning && (
          <View style={[styles.card, { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
             <Text style={styles.cardTitle}>Chaos Summary</Text>
             <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.passed}</Text>
                  <Text style={styles.summaryLabel}>Passed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{summary.dropped}</Text>
                  <Text style={styles.summaryLabel}>Dropped</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{summary.failed}</Text>
                  <Text style={styles.summaryLabel}>Failed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.avgLatency}ms</Text>
                  <Text style={styles.summaryLabel}>Avg Injected</Text>
                </View>
             </View>
          </View>
        )}

        {/* Results List */}
        {results && !isRunning && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iteration Details</Text>
            {results.map((r, idx) => (
              <View key={idx} style={styles.resultRow}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIterText}>#{r.iteration}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.resultMetaText}>
                    +{r.injectedLatencyMs}ms
                  </Text>
                  {getStatusBadge(r)}
                </View>
                {r.error && (
                  <Text style={styles.errorText}>{r.error}</Text>
                )}
                {r.responseStatus ? (
                  <Text style={styles.detailText}>
                    Response: {r.responseStatus} {r.totalTimeMs ? `(${Math.round(r.totalTimeMs)}ms total)` : ''}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Request Selector Modal */}
      <Modal
        visible={showSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Request</Text>
              <TouchableOpacity onPress={() => setShowSelector(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {allRequests.map(req => (
                <TouchableOpacity
                  key={req.id}
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedRequest(req);
                    setShowSelector(false);
                    setResults(null);
                  }}
                >
                  <Text style={[styles.methodBadge, { color: getMethodColor(req.method) }]}>
                    {req.method}
                  </Text>
                  <Text style={styles.modalRowText} numberOfLines={1}>
                    {req.name || req.url}
                  </Text>
                </TouchableOpacity>
              ))}
              {allRequests.length === 0 && (
                <Text style={styles.emptyText}>No saved requests found.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getMethodColor(method: string) {
  switch (method) {
    case 'GET': return '#3B82F6';
    case 'POST': return '#10B981';
    case 'PUT': return '#F59E0B';
    case 'DELETE': return '#EF4444';
    case 'PATCH': return '#F59E0B';
    default: return '#94A3B8';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  requestSelectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    borderRadius: 8,
  },
  requestSelectorText: { color: '#E2E8F0', fontSize: 14, flex: 1 },
  requestSelectorPlaceholder: { color: '#64748B', fontSize: 14, flex: 1 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  inputGroup: { flex: 0.48 },
  inputLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 6, fontWeight: '500' },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  actionContainer: { marginBottom: 16 },
  runBtn: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
  },
  runBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  runningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  runningText: { color: '#94A3B8', fontSize: 14, flex: 1 },
  cancelBtn: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  cancelBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#10B981' },
  summaryLabel: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  resultRow: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  resultIterText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginRight: 12 },
  resultMetaText: { color: '#CBD5E1', fontSize: 12, marginRight: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgePassed: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  badgeTextPassed: { color: '#10B981', fontSize: 10, fontWeight: '700' },
  badgeDropped: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  badgeTextDropped: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  badgeFailed: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  badgeTextFailed: { color: '#EF4444', fontSize: 10, fontWeight: '700' },
  detailText: { color: '#94A3B8', fontSize: 12 },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '600' },
  modalList: { padding: 16 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  methodBadge: { fontSize: 12, fontWeight: '700', width: 50 },
  modalRowText: { color: '#E2E8F0', fontSize: 14, flex: 1 },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 32 },
});
