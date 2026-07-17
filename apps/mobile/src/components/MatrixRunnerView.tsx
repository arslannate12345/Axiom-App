import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useCollectionsStore } from '../stores/collectionsStore';
import { runCollection } from '../services/collectionRunner';
import type { Environment } from '../types/database';
import type { RunnerStepState } from '../types/runner';

interface MatrixRunnerViewProps {
  collectionId: string | null;
  onClose: () => void;
}

export function MatrixRunnerView({ collectionId, onClose }: MatrixRunnerViewProps) {
  const { environments, variables } = useEnvironmentStore();
  const { collections, requests } = useCollectionsStore();
  
  const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'cancelled'>('idle');
  const [results, setResults] = useState<Record<string, RunnerStepState[]>>({});
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset when opened
  useEffect(() => {
    if (collectionId) {
      setStatus('idle');
      setResults({});
      setSelectedEnvIds(new Set());
    } else {
      abortControllerRef.current?.abort();
    }
  }, [collectionId]);

  const toggleEnv = (id: string) => {
    const next = new Set(selectedEnvIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEnvIds(next);
  };

  const handleStart = async () => {
    if (!collectionId) return;
    const reqs = requests[collectionId] || [];
    if (reqs.length === 0) {
      Alert.alert('Empty Collection', 'There are no requests in this collection.');
      return;
    }
    if (selectedEnvIds.size < 2) {
      Alert.alert('Select Environments', 'Please select at least two environments to matrix test.');
      return;
    }

    abortControllerRef.current = new AbortController();
    setStatus('running');
    setIsRunning(true);
    setResults({});

    const envArray = Array.from(selectedEnvIds);
    const newResults: Record<string, RunnerStepState[]> = {};

    try {
      // Initialize empty state for these envs
      for (const envId of envArray) {
        newResults[envId] = [];
      }
      setResults({ ...newResults });

      // Run sequentially for stability (parallel could overwhelm the JS thread / rate limits)
      for (const envId of envArray) {
        if (abortControllerRef.current.signal.aborted) throw new Error('Aborted');

        // Prepare variables for this environment
        const globalEnv = environments.find(e => e.name === 'Global');
        const globalEnvId = globalEnv ? globalEnv.id : 'global-env-id';
        const globalVars = variables[globalEnvId] ?? [];
        const envVarsList = (envId !== globalEnvId) ? (variables[envId] ?? []) : [];
        
        const mergedVars: Record<string, string> = {};
        for (const v of globalVars) {
          if (v.key) mergedVars[v.key.trim()] = v.value;
        }
        for (const v of envVarsList) {
          if (v.key) mergedVars[v.key.trim()] = v.value;
        }

        await runCollection({
          collectionId,
          requests: reqs,
          environmentId: envId,
          baseVariables: mergedVars,
          signal: abortControllerRef.current.signal,
          onProgress: (index, state) => {
            newResults[envId][index] = state;
            setResults({ ...newResults });
          }
        });
      }
      setStatus('completed');
    } catch (e: any) {
      if (e.message !== 'Aborted') {
        Alert.alert('Matrix Run Error', e.message);
      }
      setStatus('cancelled');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  if (!collectionId) return null;

  const reqs = requests[collectionId] || [];
  const envArray = Array.from(selectedEnvIds);

  return (
    <Modal visible={!!collectionId} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Matrix Runner</Text>
                <Text style={styles.subtitle}>Test across multiple environments</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {status === 'idle' ? (
              <View style={styles.content}>
                <Text style={styles.sectionTitle}>Select Environments</Text>
                <ScrollView contentContainerStyle={styles.envList}>
                  {environments.map(env => (
                    <TouchableOpacity 
                      key={env.id} 
                      style={[styles.envOption, selectedEnvIds.has(env.id) && styles.envOptionActive]}
                      onPress={() => toggleEnv(env.id)}
                    >
                      <Ionicons 
                        name={selectedEnvIds.has(env.id) ? "checkbox" : "square-outline"} 
                        size={20} 
                        color={selectedEnvIds.has(env.id) ? "#6366F1" : "#64748B"} 
                      />
                      <Text style={styles.envOptionText}>{env.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.footer}>
                  <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                    <Text style={styles.startBtnText}>Start Matrix Test</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.content}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusText}>
                    {status === 'running' ? 'Running Matrix Test...' : status === 'completed' ? 'Completed' : 'Cancelled'}
                  </Text>
                  {status === 'running' && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <ScrollView style={styles.gridContainer}>
                    <View style={styles.gridHeaderRow}>
                      <View style={[styles.gridCell, styles.gridCellReq]}><Text style={styles.gridHeaderText}>Request</Text></View>
                      {envArray.map(envId => {
                        const env = environments.find(e => e.id === envId);
                        return (
                          <View key={envId} style={[styles.gridCell, { paddingLeft: 30 }]}>
                            <Text style={styles.gridHeaderText}>{env?.name}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {reqs.map((req, index) => (
                      <View key={req.id} style={styles.gridRow}>
                        <View style={[styles.gridCell, styles.gridCellReq]}>
                          <Text style={styles.reqNameText} numberOfLines={1}>{req.name}</Text>
                        </View>
                        {envArray.map(envId => {
                          const state = results[envId]?.[index];
                          if (!state) {
                            return (
                              <View key={envId} style={styles.gridCell}>
                                {status === 'running' ? <ActivityIndicator size="small" color="#475569" /> : <Text style={styles.resultText}>-</Text>}
                              </View>
                            );
                          }
                          const isSuccess = state.status === 'passed';
                          const isFail = state.status === 'failed';
                          const isRunningStep = state.status === 'running';

                          if (isRunningStep) {
                            return (
                              <View key={envId} style={[styles.gridCell, styles.resultCell]}>
                                <ActivityIndicator size="small" color="#818CF8" />
                              </View>
                            );
                          }

                          const statusCode = state.result?.status_code;
                          const latencyMs = state.result?.latency_ms;
                          const errorMessage = state.result?.error;

                          return (
                            <View key={envId} style={[styles.gridCell, styles.resultCell]}>
                              {isSuccess && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                              {isFail && <Ionicons name="close-circle" size={16} color="#EF4444" />}
                              <Text style={[styles.resultText, isSuccess && styles.resultCellSuccess, isFail && styles.resultCellError]} numberOfLines={1}>
                                {statusCode || errorMessage?.substring(0, 15) || 'Err'} {latencyMs ? `(${latencyMs}ms)` : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </ScrollView>
                </ScrollView>
              </View>
            )}
          </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1 },
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#F1F5F9' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  closeBtn: { padding: 8 },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#E2E8F0', marginBottom: 16 },
  envList: { gap: 12 },
  envOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  envOptionActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  envOptionText: { fontSize: 16, color: '#F1F5F9', marginLeft: 12, fontWeight: '500' },
  footer: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#334155' },
  startBtn: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  startBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusText: { fontSize: 16, color: '#818CF8', fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 8 },
  cancelBtnText: { color: '#EF4444', fontWeight: '600' },
  gridContainer: { flex: 1 },
  gridHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 12 },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingVertical: 12 },
  gridCell: { width: 150, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 8 },
  gridCellReq: { width: 180 },
  gridHeaderText: { color: '#F8FAFC', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  reqNameText: { color: '#F8FAFC', fontSize: 14, fontWeight: '500' },
  resultCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultCellSuccess: { color: '#10B981' },
  resultCellError: { color: '#EF4444' },
  resultText: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
});
