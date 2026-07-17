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
import { AnimatedBackground } from '../AnimatedBackground';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { getAssertions } from '../../services/dataService';
import { startBenchmarkRun, BenchmarkProgress } from '../../services/benchmarkEngine';
import type { Request } from '../../types/database';
import { LineChart } from 'react-native-chart-kit';
import { useKeepAwake } from 'expo-keep-awake';

const screenWidth = Dimensions.get('window').width;

export function BenchmarkSuite() {
  const requests = useCollectionsStore((s) => s.requests);
  const activeWorkspaceId = useCollectionsStore((s) => s.activeWorkspaceId);
  const collections = useCollectionsStore((s) => s.collections);
  const loadCollections = useCollectionsStore((s) => s.loadCollections);
  const loadRequests = useCollectionsStore((s) => s.loadRequests);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [mode, setMode] = useState<'fixed' | 'ramp' | 'spike' | 'soak'>('fixed');
  
  // Mode parameters
  const [iterations, setIterations] = useState('50');
  const [batchSize, setBatchSize] = useState('5');
  const [durationSecs, setDurationSecs] = useState('60');
  const [startBatchSize, setStartBatchSize] = useState('1');
  const [endBatchSize, setEndBatchSize] = useState('20');
  const [spikeBatchSize, setSpikeBatchSize] = useState('50');
  const [spikeTimeSecs, setSpikeTimeSecs] = useState('30');
  
  const [showSelector, setShowSelector] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  
  // Conditionally keep device awake if soak mode is running
  if (isRunning && mode === 'soak') {
    useKeepAwake();
  }
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
      // Fetch assertions configured for this request
      const assertions = await getAssertions(selectedRequest.id);
      
      const result = await startBenchmarkRun({
        request: selectedRequest,
        variables: getActiveVariables(),
        mode,
        totalIterations: iterCount,
        batchSize: batchCount,
        durationMs: parseInt(durationSecs, 10) * 1000 || 60000,
        startBatchSize: parseInt(startBatchSize, 10) || 1,
        endBatchSize: parseInt(endBatchSize, 10) || 20,
        baseBatchSize: batchCount,
        spikeBatchSize: parseInt(spikeBatchSize, 10) || 50,
        spikeTimeMs: parseInt(spikeTimeSecs, 10) * 1000 || 30000,
        assertions: assertions.map(a => ({
          id: a.id,
          field: a.field,
          operator: a.operator,
          expected_value: a.expected_value ?? '',
          enabled: true
        })),
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });

      setStats(result.stats);
      
      // Prepare chart data (only successful ones with latency)
      const latencies = result.iterations
        .filter(i => i.latency_ms !== null)
        .map(i => i.latency_ms as number);
      
      const maxPoints = 50;
      let sampledLatencies = latencies;
      if (latencies.length > maxPoints) {
        const chunkSize = Math.ceil(latencies.length / maxPoints);
        sampledLatencies = [];
        for (let i = 0; i < latencies.length; i += chunkSize) {
          const chunk = latencies.slice(i, i + chunkSize);
          const avg = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
          sampledLatencies.push(Math.round(avg));
        }
      }
      
      setChartData(sampledLatencies);

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
    <>
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

            <View style={styles.modeSelector}>
              {(['fixed', 'ramp', 'spike', 'soak'] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                  onPress={() => setMode(m)}
                  disabled={isRunning}
                >
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === 'fixed' && (
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
                  <Text style={styles.label}>Batch Size</Text>
                  <TextInput
                    style={styles.input}
                    value={batchSize}
                    onChangeText={setBatchSize}
                    keyboardType="numeric"
                    editable={!isRunning}
                  />
                </View>
              </View>
            )}

            {mode === 'ramp' && (
              <>
                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Duration (sec)</Text>
                    <TextInput style={styles.input} value={durationSecs} onChangeText={setDurationSecs} keyboardType="numeric" editable={!isRunning} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Start Batch Size</Text>
                    <TextInput style={styles.input} value={startBatchSize} onChangeText={setStartBatchSize} keyboardType="numeric" editable={!isRunning} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>End Batch Size</Text>
                    <TextInput style={styles.input} value={endBatchSize} onChangeText={setEndBatchSize} keyboardType="numeric" editable={!isRunning} />
                  </View>
                </View>
              </>
            )}

            {mode === 'spike' && (
              <>
                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Total Iterations</Text>
                    <TextInput style={styles.input} value={iterations} onChangeText={setIterations} keyboardType="numeric" editable={!isRunning} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Base Batch Size</Text>
                    <TextInput style={styles.input} value={batchSize} onChangeText={setBatchSize} keyboardType="numeric" editable={!isRunning} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Spike Batch Size</Text>
                    <TextInput style={styles.input} value={spikeBatchSize} onChangeText={setSpikeBatchSize} keyboardType="numeric" editable={!isRunning} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Spike Start (sec)</Text>
                    <TextInput style={styles.input} value={spikeTimeSecs} onChangeText={setSpikeTimeSecs} keyboardType="numeric" editable={!isRunning} />
                  </View>
                </View>
              </>
            )}

            {mode === 'soak' && (
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Duration (sec)</Text>
                  <TextInput style={styles.input} value={durationSecs} onChangeText={setDurationSecs} keyboardType="numeric" editable={!isRunning} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Batch Size</Text>
                  <TextInput style={styles.input} value={batchSize} onChangeText={setBatchSize} keyboardType="numeric" editable={!isRunning} />
                </View>
              </View>
            )}

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
                  {mode === 'ramp' || mode === 'soak' 
                    ? `${Math.floor(progress.completed / 1000)} / ${progress.total / 1000} secs`
                    : `${progress.completed} / ${progress.total} requests completed`}
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
                  <Text style={styles.statLabel}>Fastest Request</Text>
                  <Text style={styles.statValue}>{stats.min_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Slowest Request</Text>
                  <Text style={styles.statValue}>{stats.max_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Average Speed</Text>
                  <Text style={styles.statValue}>{stats.avg_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Typical Speed</Text>
                  <Text style={styles.statValue}>{stats.p50_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Slowest 5%</Text>
                  <Text style={styles.statValue}>{stats.p95_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Worst Case</Text>
                  <Text style={styles.statValue}>{stats.p99_latency} ms</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Reliability / Failures</Text>
                  <Text style={[styles.statValue, stats.error_rate > 0 && { color: '#EF4444' }, stats.error_rate === 0 && { color: '#10B981' }]}>
                    {stats.error_rate.toFixed(1)}% Failure Rate
                  </Text>
                </View>
              </View>

              <View style={styles.summaryBox}>
                <Ionicons name="bulb-outline" size={20} color="#FBBF24" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>What does this mean?</Text>
                  <Text style={styles.summaryText}>
                    {getHumanReadableSummary(stats)}
                  </Text>
                </View>
              </View>

              {chartData.length > 0 && (
                <TouchableOpacity
                  style={styles.viewGraphBtn}
                  onPress={() => setShowGraphModal(true)}
                >
                  <Ionicons name="bar-chart" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.viewGraphBtnText}>View Detailed Graph</Text>
                </TouchableOpacity>
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

      {/* Graph Modal */}
      <Modal
        visible={showGraphModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGraphModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Latency Analysis (ms)</Text>
              <TouchableOpacity onPress={() => setShowGraphModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View style={styles.graphModalBody}>
              <Text style={styles.graphInstruction}>
                The graph below shows the latency curve. X-axis labels are hidden to prevent clutter.
              </Text>
              <LineChart
                data={{
                  labels: chartData.map(() => ''), // Hide X-axis labels
                  datasets: [{ data: chartData }],
                }}
                width={screenWidth - 32} // Use more width
                height={Dimensions.get('window').height * 0.5} // Taller chart
                withDots={true}
                withInnerLines={true}
                yAxisSuffix="ms"
                chartConfig={{
                  backgroundColor: '#0F172A',
                  backgroundGradientFrom: '#0F172A',
                  backgroundGradientTo: '#1E293B',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#818CF8"
                  }
                }}
                bezier
                formatXLabel={() => ''} // explicitly hide x labels
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  alignSelf: 'center',
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
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

function getHumanReadableSummary(stats: any) {
  if (!stats) return '';
  
  let health = '';
  if (stats.error_rate === 0) {
    health = "Flawless! Your server successfully handled all requests without a single network error. This means every request made a full round trip and received a valid HTTP response (even if that response was an HTTP error like a 404/500, it didn't completely timeout or crash).";
  } else if (stats.error_rate < 5) {
    health = `Mostly stable. Your endpoint experienced network failures on ${stats.error_rate.toFixed(1)}% of requests (e.g. timeouts or connection drops).`;
  } else {
    health = `Struggling. Your endpoint failed ${stats.error_rate.toFixed(1)}% of the time under load.`;
  }

  let speed = '';
  if (stats.avg_latency < 200) {
    speed = "It is lightning fast, responding in an average of " + stats.avg_latency + "ms.";
  } else if (stats.avg_latency < 800) {
    speed = "Performance is decent with an average response time of " + stats.avg_latency + "ms.";
  } else {
    speed = "It is running quite slow, taking on average " + stats.avg_latency + "ms to respond.";
  }

  let consistency = '';
  if (stats.p95_latency && stats.p50_latency) {
    const diff = stats.p95_latency - stats.p50_latency;
    if (diff < 100) {
      consistency = "It is also highly consistent; even your slowest 5% of requests felt as fast as the typical request.";
    } else if (diff < 500) {
      consistency = "Consistency is okay, but 5% of your users (the slow ones) are experiencing some noticeable delay.";
    } else {
      consistency = "However, it is very inconsistent. The slowest 5% of requests take significantly longer than the typical request, meaning some users are having a terrible experience under this load.";
    }
  }

  return `${health} ${speed} ${consistency}`;
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
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: '#6366F1',
  },
  modeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
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
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  summaryTitle: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 20,
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
  viewGraphBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewGraphBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  graphModalBody: {
    padding: 16,
    flex: 1,
  },
  graphInstruction: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
});
