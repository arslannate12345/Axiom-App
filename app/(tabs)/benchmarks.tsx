import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useState, useRef, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '../../src/components/AnimatedBackground';
import { useCollectionsStore } from '../../src/stores/collectionsStore';
import { useEnvironmentStore } from '../../src/stores/environmentStore';
import { startBenchmarkRun, BenchmarkProgress } from '../../src/services/benchmarkEngine';
import type { Request } from '../../src/types/database';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function BenchmarksScreen() {
  const { requests, activeWorkspaceId, collections, loadCollections, loadRequests } = useCollectionsStore();
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [iterations, setIterations] = useState('50');
  const [batchSize, setBatchSize] = useState('5');
  const [showSelector, setShowSelector] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Load all requests for the active workspace so the selector is populated
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

  // Flatten all requests for the selector
  const allRequests = useMemo(() => {
    return Object.values(requests).flat();
  }, [requests]);

  const handleStart = async () => {
    if (!selectedRequest) return;

    const iterCount = parseInt(iterations, 10);
    const batchCount = parseInt(batchSize, 10);

    if (isNaN(iterCount) || iterCount <= 0 || isNaN(batchCount) || batchCount <= 0) {
      alert('Please enter valid positive numbers for iterations and batch size.');
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setStats(null);
    setChartData([]);

    abortRef.current = new AbortController();

    try {
      const result = await startBenchmarkRun({
        request: selectedRequest,
        variables: getActiveVariables(),
        totalIterations: iterCount,
        batchSize: batchCount,
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });

      setStats(result.stats);
      
      // Prepare chart data (only successful ones with latency)
      const latencies = result.iterations
        .filter(i => i.latency_ms !== null)
        .map(i => i.latency_ms as number);
      
      setChartData(latencies);

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Benchmark failed');
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const renderRequestItem = ({ item }: { item: Request }) => (
    <TouchableOpacity
      style={styles.selectorItem}
      onPress={() => {
        setSelectedRequest(item);
        setShowSelector(false);
        setStats(null);
        setChartData([]);
      }}
    >
      <View style={[styles.methodBadge, { backgroundColor: getMethodColor(item.method) }]}>
        <Text style={styles.methodText}>{item.method}</Text>
      </View>
      <View style={styles.selectorItemInfo}>
        <Text style={styles.selectorItemName}>{item.name}</Text>
        <Text style={styles.selectorItemUrl} numberOfLines={1}>
          {item.url}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Configuration Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Configuration</Text>
            
            <Text style={styles.label}>Target Request</Text>
            <TouchableOpacity
              style={styles.requestSelectorBtn}
              onPress={() => setShowSelector(true)}
              disabled={isRunning}
            >
              <Text style={selectedRequest ? styles.requestSelectorText : styles.requestSelectorPlaceholder}>
                {selectedRequest ? `${selectedRequest.method} ${selectedRequest.name}` : 'Select a saved request...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Iterations</Text>
                <TextInput
                  style={styles.input}
                  value={iterations}
                  onChangeText={setIterations}
                  keyboardType="numeric"
                  editable={!isRunning}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Concurrency (Batch Size)</Text>
                <TextInput
                  style={styles.input}
                  value={batchSize}
                  onChangeText={setBatchSize}
                  keyboardType="numeric"
                  editable={!isRunning}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.startBtn,
                (!selectedRequest || isRunning) && styles.startBtnDisabled,
                isRunning && styles.startBtnCancel,
              ]}
              onPress={isRunning ? handleCancel : handleStart}
              disabled={!selectedRequest && !isRunning}
            >
              {isRunning ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.startBtnText}>Cancel Benchmark</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.startBtnText}>Start Benchmark</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Progress Card */}
          {isRunning && progress && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Running...</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${(progress.completed / progress.total) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {progress.completed} / {progress.total} requests completed
                </Text>
              </View>
            </View>
          )}

          {/* Results Card */}
          {stats && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Results</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Avg Latency</Text>
                  <Text style={styles.statValue}>{stats.avg_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>P95 Latency</Text>
                  <Text style={styles.statValue}>{stats.p95_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>P99 Latency</Text>
                  <Text style={styles.statValue}>{stats.p99_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Error Rate</Text>
                  <Text style={[styles.statValue, stats.error_rate > 0 && { color: '#EF4444' }]}>
                    {stats.error_rate.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {chartData.length > 0 && (
                <View style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>Latency over Time (ms)</Text>
                  <LineChart
                    data={{
                      labels: chartData.map((_, i) => `${i + 1}`),
                      datasets: [{ data: chartData }],
                    }}
                    width={screenWidth - 64} // padding adjustments
                    height={220}
                    withDots={false}
                    withInnerLines={false}
                    yAxisSuffix="ms"
                    yAxisInterval={1}
                    chartConfig={{
                      backgroundColor: 'transparent',
                      backgroundGradientFrom: 'transparent',
                      backgroundGradientTo: 'transparent',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: "0",
                      }
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 16,
                      marginLeft: -16,
                    }}
                  />
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </View>

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
            <FlatList
              data={allRequests}
              keyExtractor={(item) => item.id}
              renderItem={renderRequestItem}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No saved requests found.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
}

function getMethodColor(method: string) {
  switch (method) {
    case 'GET': return '#10B981';
    case 'POST': return '#3B82F6';
    case 'PUT': return '#F59E0B';
    case 'DELETE': return '#EF4444';
    case 'PATCH': return '#8B5CF6';
    default: return '#64748B';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  requestSelectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  requestSelectorText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '500',
  },
  requestSelectorPlaceholder: {
    color: '#64748B',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F1F5F9',
    fontSize: 14,
  },
  startBtn: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnCancel: {
    backgroundColor: '#EF4444',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  chartTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  methodText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  selectorItemInfo: {
    flex: 1,
  },
  selectorItemName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectorItemUrl: {
    color: '#94A3B8',
    fontSize: 12,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 32,
  },
});
