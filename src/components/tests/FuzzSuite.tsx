import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { runFuzzTest, MutationStrategy, FuzzResult } from '../../services/fuzzerService';
import type { Request } from '../../types/database';

const ALL_STRATEGIES: { id: MutationStrategy; label: string }[] = [
  { id: 'null', label: 'Null Injection' },
  { id: 'wrong_type', label: 'Wrong Type' },
  { id: 'oversized', label: 'Oversized String' },
  { id: 'empty', label: 'Empty Fields' },
  { id: 'unicode', label: 'Unicode Edge Cases' },
  { id: 'missing', label: 'Missing Fields' },
];

export function FuzzSuite() {
  const requests = useCollectionsStore((s) => s.requests);
  const activeWorkspaceId = useCollectionsStore((s) => s.activeWorkspaceId);
  const collections = useCollectionsStore((s) => s.collections);
  const loadCollections = useCollectionsStore((s) => s.loadCollections);
  const loadRequests = useCollectionsStore((s) => s.loadRequests);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  
  const [activeStrategies, setActiveStrategies] = useState<Set<MutationStrategy>>(
    new Set(['null', 'wrong_type', 'oversized', 'empty', 'unicode', 'missing'])
  );
  const [iterations, setIterations] = useState('10');

  const [isRunning, setIsRunning] = useState(false);
  const [progressStr, setProgressStr] = useState<string>('');
  const [results, setResults] = useState<FuzzResult[] | null>(null);

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

  const toggleStrategy = (strategy: MutationStrategy) => {
    const next = new Set(activeStrategies);
    if (next.has(strategy)) {
      next.delete(strategy);
    } else {
      next.add(strategy);
    }
    setActiveStrategies(next);
  };

  const handleRunTest = async () => {
    if (!selectedRequest) return;
    if (activeStrategies.size === 0) {
      alert('Please select at least one mutation strategy.');
      return;
    }
    const iters = parseInt(iterations, 10);
    if (isNaN(iters) || iters <= 0) {
      alert('Please enter a valid number of iterations.');
      return;
    }
    
    setIsRunning(true);
    setResults(null);
    setProgressStr('Initializing...');

    try {
      const vars = getActiveVariables();
      const res = await runFuzzTest(
        selectedRequest,
        vars,
        Array.from(activeStrategies),
        iters,
        (strategy, current, total) => {
          setProgressStr(`Testing ${strategy}... (${current}/${total})`);
        }
      );
      setResults(res);
    } catch (err: any) {
      alert('Fuzz test failed: ' + err.message);
    } finally {
      setIsRunning(false);
      setProgressStr('');
    }
  };

  const renderRequestItem = ({ item }: { item: Request }) => (
    <TouchableOpacity
      style={styles.selectorItem}
      onPress={() => {
        setSelectedRequest(item);
        setShowSelector(false);
        setResults(null);
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
              {selectedRequest ? `${selectedRequest.method} ${selectedRequest.name}` : 'Select a saved request...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {selectedRequest && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mutation Strategies</Text>
            <View style={styles.chipsContainer}>
              {ALL_STRATEGIES.map(strat => {
                const isActive = activeStrategies.has(strat.id);
                return (
                  <TouchableOpacity
                    key={strat.id}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => toggleStrategy(strat.id)}
                    disabled={isRunning}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {strat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.configRow}>
              <Text style={styles.label}>Iterations per Strategy</Text>
              <TextInput
                style={styles.input}
                value={iterations}
                onChangeText={setIterations}
                keyboardType="numeric"
                editable={!isRunning}
              />
            </View>

            <TouchableOpacity
              style={[styles.runBtn, isRunning && styles.runBtnDisabled]}
              onPress={handleRunTest}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.runBtnText}>{progressStr}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.runBtnText}>Run Fuzz Test</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Results UI */}
        {results && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fuzz Results</Text>
            {results.map((res, idx) => (
              <View key={idx} style={styles.resultItem}>
                <View style={styles.resultItemHeader}>
                  <Text style={styles.resultStrategyName}>
                    {ALL_STRATEGIES.find(s => s.id === res.strategy)?.label || res.strategy}
                  </Text>
                  <Text style={styles.resultTotalText}>{res.total} total</Text>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, styles.statPass]}>
                    <Text style={styles.statBadgeValue}>{res.passed}</Text>
                    <Text style={styles.statBadgeLabel}>Safe</Text>
                  </View>
                  <View style={[styles.statBadge, styles.statFail]}>
                    <Text style={styles.statBadgeValue}>{res.failed}</Text>
                    <Text style={styles.statBadgeLabel}>Crash</Text>
                  </View>
                  <View style={[styles.statBadge, styles.statTimeout]}>
                    <Text style={styles.statBadgeValue}>{res.timeout}</Text>
                    <Text style={styles.statBadgeLabel}>Timeout</Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.summaryBox}>
              <Ionicons name="bulb-outline" size={20} color="#FBBF24" style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>What does this mean?</Text>
                <Text style={styles.summaryText}>
                  "Safe" means your server handled the garbage data gracefully (e.g., returned a 400 Bad Request). 
                  "Crash" means the server threw a 500 error. "Timeout" means the garbage data caused the server to hang.
                </Text>
              </View>
            </View>
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
    </View>
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 16,
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#818CF8',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#818CF8',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    textAlign: 'center',
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 10,
  },
  runBtnDisabled: {
    opacity: 0.7,
  },
  runBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  resultItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  resultItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultStrategyName: {
    color: '#F1F5F9',
    fontWeight: '600',
    fontSize: 15,
  },
  resultTotalText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  statPass: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statTimeout: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statBadgeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
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
