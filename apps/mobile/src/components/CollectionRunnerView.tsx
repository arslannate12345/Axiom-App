import { useEffect, useRef } from 'react';
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
import { useRunnerStore } from '../stores/runnerStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { runCollection } from '../services/collectionRunner';

export function CollectionRunnerView() {
  const {
    isOpen,
    activeCollectionId,
    status,
    steps,
    activeStepIndex,
    totalDuration,
    closeRunner,
    setRunStatus,
    updateStepProgress,
    setTotalDuration,
  } = useRunnerStore();
  const { activeEnvironmentId, getActiveVariables } = useEnvironmentStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleStart = async () => {
    if (!activeCollectionId || steps.length === 0) return;

    abortControllerRef.current = new AbortController();
    setRunStatus('running');

    try {
      await runCollection({
        collectionId: activeCollectionId,
        requests: steps.map((s) => s.request),
        environmentId: activeEnvironmentId,
        baseVariables: getActiveVariables(),
        signal: abortControllerRef.current.signal,
        onProgress: (index, state) => {
          updateStepProgress(index, state);
        },
      });

      // After it finishes normally (not cancelled)
      if (!abortControllerRef.current.signal.aborted) {
        setRunStatus('completed');
        // calculate total duration from steps if not set
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        Alert.alert('Runner Error', (err as Error).message);
        setRunStatus('failed');
      }
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setRunStatus('cancelled');
  };

  const handleClose = () => {
    if (status === 'running') {
      Alert.alert('Cancel Run', 'Are you sure you want to cancel the active run?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            handleCancel();
            closeRunner();
          },
        },
      ]);
      return;
    }
    closeRunner();
  };

  if (!isOpen) return null;

  const passedCount = steps.filter((s) => s.status === 'passed').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;

  return (
    <Modal visible={isOpen} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Collection Runner</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryBar}>
          <View style={styles.summaryStats}>
            <Text style={styles.summaryText}>
              Steps: {steps.length} | Passed: {passedCount} | Failed: {failedCount}
            </Text>
            {status !== 'pending' && status !== 'running' && (
              <Text style={styles.summaryStatus}>
                Status: {status.toUpperCase()}
              </Text>
            )}
          </View>

          {status === 'pending' && (
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.startBtnText}>Start Run</Text>
            </TouchableOpacity>
          )}

          {status === 'running' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="stop" size={16} color="#FFF" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {(status === 'completed' || status === 'cancelled' || status === 'failed') && (
            <TouchableOpacity style={styles.startBtn} onPress={() => {
              // reset steps
              useRunnerStore.setState({
                status: 'pending',
                steps: steps.map((s) => ({ request: s.request, status: 'pending' })),
                activeStepIndex: 0,
                totalDuration: null
              });
            }}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.startBtnText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.stepsList} contentContainerStyle={styles.stepsContent}>
          {steps.map((step, idx) => (
            <View key={step.request.id} style={[styles.stepCard, idx === activeStepIndex && status === 'running' && styles.stepCardActive]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepMethod}>
                  <Text style={[styles.methodText, { color: getMethodColor(step.request.method) }]}>
                    {step.request.method}
                  </Text>
                </View>
                <Text style={styles.stepName} numberOfLines={1}>
                  {step.request.name || step.request.url}
                </Text>

                <View style={styles.stepStatusIcon}>
                  {step.status === 'pending' && <Ionicons name="time-outline" size={20} color="#64748B" />}
                  {step.status === 'running' && <ActivityIndicator size="small" color="#6366F1" />}
                  {step.status === 'passed' && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                  {step.status === 'failed' && <Ionicons name="close-circle" size={20} color="#EF4444" />}
                  {step.status === 'skipped' && <Ionicons name="arrow-redo-outline" size={20} color="#64748B" />}
                </View>
              </View>

              {step.result && (
                <View style={styles.stepDetails}>
                  <Text style={styles.detailText}>
                    Status: {step.result.status_code || 'Err'} • Time: {step.result.latency_ms || 0}ms
                  </Text>

                  {step.result.assertion_failures.length > 0 && (
                    <View style={styles.failuresBox}>
                      {step.result.assertion_failures.map((f, i) => (
                        <Text key={i} style={styles.failureText}>• {f}</Text>
                      ))}
                    </View>
                  )}

                  {step.result.extracted_variables && Object.keys(step.result.extracted_variables).length > 0 && (
                    <View style={styles.extractionsBox}>
                      <Text style={styles.extractionsTitle}>Extracted Variables:</Text>
                      {Object.entries(step.result.extracted_variables).map(([k, v]) => (
                        <Text key={k} style={styles.extractionText}>
                          {k} = {v}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function getMethodColor(method: string) {
  switch (method) {
    case 'GET': return '#3B82F6';
    case 'POST': return '#10B981';
    case 'PUT': return '#F59E0B';
    case 'PATCH': return '#F59E0B';
    case 'DELETE': return '#EF4444';
    default: return '#94A3B8';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  closeBtn: {
    padding: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  summaryStats: {
    flex: 1,
  },
  summaryText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryStatus: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  startBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  cancelBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  stepsList: {
    flex: 1,
  },
  stepsContent: {
    padding: 16,
    gap: 12,
  },
  stepCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepCardActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepMethod: {
    width: 60,
  },
  methodText: {
    fontWeight: '700',
    fontSize: 13,
  },
  stepName: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '500',
  },
  stepStatusIcon: {
    width: 24,
    alignItems: 'center',
  },
  stepDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  detailText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  failuresBox: {
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  failureText: {
    color: '#FCA5A5',
    fontSize: 12,
  },
  extractionsBox: {
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  extractionsTitle: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  extractionText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
