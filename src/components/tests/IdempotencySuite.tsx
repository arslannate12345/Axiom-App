import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { runIdempotencyTest, IdempotencyConfig, IdempotencyResult } from '../../services/idempotencyService';
import type { Request } from '../../types/database';

export function IdempotencySuite() {
  const requests = useCollectionsStore((s) => s.requests);
  const activeWorkspaceId = useCollectionsStore((s) => s.activeWorkspaceId);
  const collections = useCollectionsStore((s) => s.collections);
  const loadCollections = useCollectionsStore((s) => s.loadCollections);
  const loadRequests = useCollectionsStore((s) => s.loadRequests);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  
  const [mode, setMode] = useState<'sequential' | 'parallel'>('sequential');

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IdempotencyResult | null>(null);
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
    
    setIsRunning(true);
    setResult(null);
    abortControllerRef.current = new AbortController();

    const config: IdempotencyConfig = { mode };

    try {
      const vars = getActiveVariables();
      const res = await runIdempotencyTest(
        selectedRequest,
        vars,
        config,
        abortControllerRef.current.signal
      );
      if (!abortControllerRef.current.signal.aborted) {
        setResult(res);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        alert('Idempotency testing failed: ' + (err as Error).message);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
  };

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
            <Text style={styles.cardTitle}>Execution Mode</Text>
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'sequential' && styles.modeBtnActive]}
                onPress={() => setMode('sequential')}
                disabled={isRunning}
              >
                <Ionicons name="list" size={16} color={mode === 'sequential' ? "#FFF" : "#94A3B8"} style={{marginRight: 6}} />
                <Text style={[styles.modeText, mode === 'sequential' && styles.modeTextActive]}>Sequential</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'parallel' && styles.modeBtnActive]}
                onPress={() => setMode('parallel')}
                disabled={isRunning}
              >
                <Ionicons name="flash" size={16} color={mode === 'parallel' ? "#FFF" : "#94A3B8"} style={{marginRight: 6}} />
                <Text style={[styles.modeText, mode === 'parallel' && styles.modeTextActive]}>Parallel</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modeHelp}>
              {mode === 'sequential' 
                ? 'Requests will be fired one after the other. Good for standard idempotent testing.'
                : 'Requests will be fired at the exact same time. Good for finding race conditions.'}
            </Text>
          </View>
        )}

        {/* Action Button */}
        {selectedRequest && (
          <View style={styles.actionContainer}>
            {isRunning ? (
              <View style={styles.runningContainer}>
                <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 8 }} />
                <Text style={styles.runningText}>Running tests...</Text>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.runBtn} onPress={handleRunTest}>
                <Ionicons name="play" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.runBtnText}>START IDEMPOTENCY TEST</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results */}
        {result && !isRunning && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Idempotency Result</Text>
            {result.error ? (
              <Text style={styles.errorText}>{result.error}</Text>
            ) : (
              <>
                <View style={[styles.statusBox, result.isIdempotent ? styles.statusBoxPassed : styles.statusBoxFailed]}>
                  <Ionicons name={result.isIdempotent ? "checkmark-circle" : "alert-circle"} size={24} color={result.isIdempotent ? "#10B981" : "#EF4444"} style={{ marginRight: 8 }} />
                  <Text style={[styles.statusBoxText, { color: result.isIdempotent ? "#10B981" : "#EF4444" }]}>
                    {result.isIdempotent ? 'ENDPOINT IS IDEMPOTENT' : 'ENDPOINT IS NOT IDEMPOTENT'}
                  </Text>
                </View>

                <View style={styles.comparisonGrid}>
                  <View style={styles.comparisonCol}>
                    <Text style={styles.colTitle}>Request 1</Text>
                    <Text style={styles.colStatus}>Status: {result.request1?.status}</Text>
                    <Text style={styles.colTime}>{result.request1?.totalTime}ms</Text>
                  </View>
                  <View style={styles.comparisonCol}>
                    <Text style={styles.colTitle}>Request 2</Text>
                    <Text style={styles.colStatus}>Status: {result.request2?.status}</Text>
                    <Text style={styles.colTime}>{result.request2?.totalTime}ms</Text>
                  </View>
                </View>

                {!result.statusMatch && (
                  <Text style={styles.diffHeader}>⚠️ Status Codes Do Not Match!</Text>
                )}

                {result.differences.length > 0 && (
                  <View style={styles.diffContainer}>
                    <Text style={styles.diffHeader}>Body Differences Found ({result.differences.length}):</Text>
                    {result.differences.slice(0, 5).map((diff, idx) => (
                      <View key={idx} style={styles.diffRow}>
                        <Text style={styles.diffPath}>{diff.path.join('.') || 'root'}</Text>
                        <Text style={styles.diffDetail}>
                          R1: {JSON.stringify(diff.lhs)}
                        </Text>
                        <Text style={styles.diffDetail}>
                          R2: {JSON.stringify(diff.rhs)}
                        </Text>
                      </View>
                    ))}
                    {result.differences.length > 5 && (
                      <Text style={styles.diffMore}>+ {result.differences.length - 5} more differences</Text>
                    )}
                  </View>
                )}
              </>
            )}
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
                    setResult(null);
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
  modeContainer: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 8, padding: 4 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6 },
  modeBtnActive: { backgroundColor: '#6366F1' },
  modeText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: '#FFF' },
  modeHelp: { color: '#64748B', fontSize: 12, marginTop: 12, fontStyle: 'italic' },
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
  statusBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1 },
  statusBoxPassed: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  statusBoxFailed: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  statusBoxText: { fontSize: 14, fontWeight: '700' },
  comparisonGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  comparisonCol: { flex: 1, backgroundColor: '#0F172A', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  colTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  colStatus: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  colTime: { color: '#64748B', fontSize: 12, marginTop: 4 },
  diffContainer: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#334155' },
  diffHeader: { color: '#F59E0B', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  diffRow: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  diffPath: { color: '#E2E8F0', fontSize: 13, fontFamily: 'monospace', marginBottom: 4 },
  diffDetail: { color: '#94A3B8', fontSize: 12, fontFamily: 'monospace' },
  diffMore: { color: '#64748B', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  errorText: { color: '#EF4444', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '600' },
  modalList: { padding: 16 },
  modalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  methodBadge: { fontSize: 12, fontWeight: '700', width: 50 },
  modalRowText: { color: '#E2E8F0', fontSize: 14, flex: 1 },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 32 },
});
