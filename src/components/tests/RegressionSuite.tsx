import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '../AnimatedBackground';
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useRegressionStore } from '../../stores/regressionStore';
import { executeRequest } from '../../services/networkService';
import { compareSnapshots, generateSchema, validateAgainstSchema } from '../../services/diffService';
import type { Request } from '../../types/database';
import type { DiffResult, ValidationResult } from '../../services/diffService';

export function RegressionSuite() {
  const requests = useCollectionsStore((s) => s.requests);
  const activeWorkspaceId = useCollectionsStore((s) => s.activeWorkspaceId);
  const collections = useCollectionsStore((s) => s.collections);
  const loadCollections = useCollectionsStore((s) => s.loadCollections);
  const loadRequests = useCollectionsStore((s) => s.loadRequests);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);
  const snapshots = useRegressionStore((s) => s.snapshots);
  const contracts = useRegressionStore((s) => s.contracts);
  const addSnapshot = useRegressionStore((s) => s.addSnapshot);
  const addContract = useRegressionStore((s) => s.addContract);
  const deleteSnapshot = useRegressionStore((s) => s.deleteSnapshot);
  const deleteContract = useRegressionStore((s) => s.deleteContract);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'snapshots' | 'contracts'>('snapshots');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Test Results
  const [diffResults, setDiffResults] = useState<DiffResult[] | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

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

  const currentSnapshots = selectedRequest ? (snapshots[selectedRequest.id] || []) : [];
  const currentContracts = selectedRequest ? (contracts[selectedRequest.id] || []) : [];

  const handleSaveBaseline = async () => {
    if (!selectedRequest) return;
    
    setIsSaving(true);
    try {
      const vars = getActiveVariables();
      const response = await executeRequest(selectedRequest, vars);
      
      let parsedBody = response.body;
      try { parsedBody = JSON.parse(response.body); } catch { /* text/html */ }

      if (activeTab === 'snapshots') {
        addSnapshot(selectedRequest.id, {
          name: `Snapshot ${new Date().toLocaleTimeString()}`,
          body: parsedBody
        });
        alert('Snapshot saved successfully!');
      } else {
        const schema = generateSchema(parsedBody);
        addContract(selectedRequest.id, {
          name: `Contract ${new Date().toLocaleTimeString()}`,
          schema
        });
        alert('Contract inferred and saved successfully!');
      }
    } catch (err: any) {
      alert('Failed to save baseline: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async (baseline: any) => {
    if (!selectedRequest) return;
    
    setIsRunning(true);
    setDiffResults(null);
    setValidationResult(null);

    try {
      const vars = getActiveVariables();
      const response = await executeRequest(selectedRequest, vars);
      
      let parsedBody = response.body;
      try { parsedBody = JSON.parse(response.body); } catch { /* ignore */ }

      if (activeTab === 'snapshots') {
        const diffs = compareSnapshots(baseline.body, parsedBody);
        setDiffResults(diffs);
      } else {
        const result = validateAgainstSchema(baseline.schema, parsedBody);
        setValidationResult(result);
      }
    } catch (err: any) {
      alert('Test execution failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const renderRequestItem = ({ item }: { item: Request }) => (
    <TouchableOpacity
      style={styles.selectorItem}
      onPress={() => {
        setSelectedRequest(item);
        setShowSelector(false);
        setDiffResults(null);
        setValidationResult(null);
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
          
          {/* Target Request Selector */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Target Request</Text>
            <TouchableOpacity
              style={styles.requestSelectorBtn}
              onPress={() => setShowSelector(true)}
              disabled={isRunning || isSaving}
            >
              <Text style={selectedRequest ? styles.requestSelectorText : styles.requestSelectorPlaceholder}>
                {selectedRequest ? `${selectedRequest.method} ${selectedRequest.name}` : 'Select a saved request...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {selectedRequest && (
            <View style={styles.card}>
              <View style={styles.tabsContainer}>
                <TouchableOpacity 
                  style={[styles.tabBtn, activeTab === 'snapshots' && styles.tabBtnActive]}
                  onPress={() => { setActiveTab('snapshots'); setDiffResults(null); setValidationResult(null); }}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'snapshots' && styles.tabBtnTextActive]}>
                    Regression (Snapshots)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabBtn, activeTab === 'contracts' && styles.tabBtnActive]}
                  onPress={() => { setActiveTab('contracts'); setDiffResults(null); setValidationResult(null); }}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'contracts' && styles.tabBtnTextActive]}>
                    Contracts (Schema)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.baselineHeader}>
                <Text style={styles.baselineTitle}>
                  {activeTab === 'snapshots' ? 'Saved Snapshots' : 'Saved Contracts'}
                </Text>
                <TouchableOpacity 
                  style={styles.saveBaselineBtnIcon} 
                  onPress={handleSaveBaseline}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons 
                      name={activeTab === 'snapshots' ? "camera" : "document-text"} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  )}
                </TouchableOpacity>
              </View>

              {activeTab === 'snapshots' && currentSnapshots.length === 0 && (
                <Text style={styles.emptyText}>No snapshots saved for this request.</Text>
              )}
              {activeTab === 'contracts' && currentContracts.length === 0 && (
                <Text style={styles.emptyText}>No schemas inferred for this request.</Text>
              )}

              {/* Snapshots List */}
              {activeTab === 'snapshots' && currentSnapshots.map((snap) => (
                <View key={snap.id} style={styles.baselineItem}>
                  <View style={styles.baselineItemInfo}>
                    <Text style={styles.baselineItemName}>{snap.name}</Text>
                    <Text style={styles.baselineItemDate}>{new Date(snap.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.baselineItemActions}>
                    <TouchableOpacity 
                      style={styles.runTestBtn}
                      onPress={() => handleRunTest(snap)}
                      disabled={isRunning}
                    >
                      <Text style={styles.runTestBtnText}>Run</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteSnapshot(selectedRequest.id, snap.id)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Contracts List */}
              {activeTab === 'contracts' && currentContracts.map((contract) => (
                <View key={contract.id} style={styles.baselineItem}>
                  <View style={styles.baselineItemInfo}>
                    <Text style={styles.baselineItemName}>{contract.name}</Text>
                    <Text style={styles.baselineItemDate}>{new Date(contract.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.baselineItemActions}>
                    <TouchableOpacity 
                      style={styles.runTestBtn}
                      onPress={() => handleRunTest(contract)}
                      disabled={isRunning}
                    >
                      <Text style={styles.runTestBtnText}>Run</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteContract(selectedRequest.id, contract.id)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Diff Results UI */}
          {isRunning && (
            <View style={styles.card}>
              <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 20 }} />
              <Text style={{ textAlign: 'center', color: '#94A3B8' }}>Executing request...</Text>
            </View>
          )}

          {diffResults !== null && activeTab === 'snapshots' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Regression Analysis</Text>
              {diffResults.length === 0 ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.successBannerText}>Perfect match! No structural changes detected.</Text>
                </View>
              ) : (
                <View>
                  <View style={styles.errorBanner}>
                    <Ionicons name="warning" size={24} color="#F59E0B" />
                    <Text style={styles.errorBannerText}>Found {diffResults.length} difference(s)</Text>
                  </View>
                  {diffResults.map((diff, idx) => (
                    <View key={idx} style={styles.diffItem}>
                      <Text style={styles.diffPath}>Path: {diff.path?.join('.') || 'root'}</Text>
                      {diff.kind === 'N' && <Text style={styles.diffAdded}>+ Added: {JSON.stringify(diff.rhs)}</Text>}
                      {diff.kind === 'D' && <Text style={styles.diffDeleted}>- Removed: {JSON.stringify(diff.lhs)}</Text>}
                      {diff.kind === 'E' && (
                        <Text style={styles.diffEdited}>
                          ~ Changed from {JSON.stringify(diff.lhs)} to {JSON.stringify(diff.rhs)}
                        </Text>
                      )}
                      {diff.kind === 'A' && <Text style={styles.diffEdited}>~ Array index {diff.item?.index} modified</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {validationResult !== null && activeTab === 'contracts' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contract Validation</Text>
              {validationResult.valid ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.successBannerText}>Valid! The response matches the inferred schema.</Text>
                </View>
              ) : (
                <View>
                  <View style={styles.errorBanner}>
                    <Ionicons name="warning" size={24} color="#EF4444" />
                    <Text style={styles.errorBannerText}>Found {validationResult.errors.length} schema violation(s)</Text>
                  </View>
                  {validationResult.errors.map((err, idx) => (
                    <View key={idx} style={styles.diffItem}>
                      <Text style={styles.diffPath}>Field: {err.path}</Text>
                      <Text style={styles.diffDeleted}>Error: {err.message}</Text>
                    </View>
                  ))}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#6366F1',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  baselineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  baselineTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBaselineBtnIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 16,
  },
  baselineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  baselineItemInfo: {
    flex: 1,
  },
  baselineItemName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  baselineItemDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  baselineItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runTestBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  runTestBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 12,
    borderRadius: 8,
  },
  successBannerText: {
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 8,
  },
  diffItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  diffPath: {
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  diffAdded: {
    color: '#10B981',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  diffDeleted: {
    color: '#EF4444',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  diffEdited: {
    color: '#FBBF24',
    fontFamily: 'monospace',
    fontSize: 12,
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
});
