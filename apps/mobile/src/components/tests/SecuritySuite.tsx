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
import { useCollectionsStore } from '../../stores/collectionsStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { runSecurityAudit, SecurityAuditType, SecurityResult } from '../../services/securityService';
import type { Request } from '../../types/database';

const ALL_AUDITS: { id: SecurityAuditType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'auth_strip', label: 'Auth Stripping', icon: 'key' },
  { id: 'http_downgrade', label: 'HTTP Downgrade', icon: 'lock-open' },
  { id: 'sqli', label: 'SQL Injection', icon: 'code-slash' },
  { id: 'xss', label: 'Cross-Site Scripting', icon: 'bug' },
];

export function SecuritySuite() {
  const requests = useCollectionsStore((s) => s.requests);
  const activeWorkspaceId = useCollectionsStore((s) => s.activeWorkspaceId);
  const collections = useCollectionsStore((s) => s.collections);
  const loadCollections = useCollectionsStore((s) => s.loadCollections);
  const loadRequests = useCollectionsStore((s) => s.loadRequests);
  const getActiveVariables = useEnvironmentStore((s) => s.getActiveVariables);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  
  const [activeAudits, setActiveAudits] = useState<Set<SecurityAuditType>>(
    new Set(['auth_strip', 'http_downgrade', 'sqli', 'xss'])
  );

  const [isRunning, setIsRunning] = useState(false);
  const [progressStr, setProgressStr] = useState<string>('');
  const [results, setResults] = useState<SecurityResult[] | null>(null);

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

  const toggleAudit = (audit: SecurityAuditType) => {
    const next = new Set(activeAudits);
    if (next.has(audit)) {
      next.delete(audit);
    } else {
      next.add(audit);
    }
    setActiveAudits(next);
  };

  const handleRunAudit = async () => {
    if (!selectedRequest) return;
    if (activeAudits.size === 0) {
      alert('Please select at least one security audit.');
      return;
    }
    
    setIsRunning(true);
    setResults(null);
    setProgressStr('Initializing...');

    try {
      const vars = getActiveVariables();
      const res = await runSecurityAudit(
        selectedRequest,
        vars,
        Array.from(activeAudits),
        (current, total, audit) => {
          setProgressStr(`Auditing ${audit}... (${current}/${total})`);
        }
      );
      setResults(res);
    } catch (err: any) {
      alert('Security audit failed: ' + err.message);
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
            <Text style={styles.cardTitle}>Security Audits</Text>
            <View style={styles.auditsContainer}>
              {ALL_AUDITS.map(audit => {
                const isActive = activeAudits.has(audit.id);
                return (
                  <TouchableOpacity
                    key={audit.id}
                    style={[styles.auditRow, isActive && styles.auditRowActive]}
                    onPress={() => toggleAudit(audit.id)}
                    disabled={isRunning}
                  >
                    <Ionicons 
                      name={audit.icon} 
                      size={20} 
                      color={isActive ? "#F43F5E" : "#64748B"} 
                      style={{ marginRight: 12 }}
                    />
                    <Text style={[styles.auditText, isActive && styles.auditTextActive]}>
                      {audit.label}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons 
                      name={isActive ? "checkbox" : "square-outline"} 
                      size={20} 
                      color={isActive ? "#F43F5E" : "#475569"} 
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.runBtn, isRunning && styles.runBtnDisabled]}
              onPress={handleRunAudit}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.runBtnText}>{progressStr}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.runBtnText}>Run Security Audit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Results UI */}
        {results && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vulnerability Report</Text>
            {results.map((res, idx) => {
              const auditDef = ALL_AUDITS.find(a => a.id === res.audit);
              return (
                <View key={idx} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Ionicons name={auditDef?.icon || 'shield'} size={18} color="#94A3B8" />
                    <Text style={styles.resultAuditName}>{auditDef?.label || res.audit}</Text>
                    <View style={{ flex: 1 }} />
                    
                    {res.status === 'passed' && (
                      <View style={[styles.statusBadge, styles.statusPassed]}>
                        <Text style={styles.statusTextPassed}>SECURE</Text>
                      </View>
                    )}
                    {res.status === 'failed' && (
                      <View style={[styles.statusBadge, styles.statusFailed]}>
                        <Text style={styles.statusTextFailed}>VULNERABLE</Text>
                      </View>
                    )}
                    {res.status === 'skipped' && (
                      <View style={[styles.statusBadge, styles.statusSkipped]}>
                        <Text style={styles.statusTextSkipped}>SKIPPED</Text>
                      </View>
                    )}
                    {res.status === 'error' && (
                      <View style={[styles.statusBadge, styles.statusError]}>
                        <Text style={styles.statusTextError}>ERROR</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.resultMessage}>{res.message}</Text>
                  {res.details && (
                    <Text style={styles.resultDetails}>{res.details}</Text>
                  )}
                </View>
              );
            })}
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
  auditsContainer: {
    marginBottom: 20,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  auditRowActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  auditText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
  auditTextActive: {
    color: '#F1F5F9',
    fontWeight: '600',
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F43F5E',
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultAuditName: {
    color: '#F1F5F9',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPassed: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusTextPassed: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  statusFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusTextFailed: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  statusSkipped: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  statusTextSkipped: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  statusError: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusTextError: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  resultMessage: {
    color: '#CBD5E1',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  resultDetails: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'monospace',
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
