import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCollectionsStore } from '../../src/stores/collectionsStore';
import { useRunnerStore } from '../../src/stores/runnerStore';
import { useEnvironmentStore } from '../../src/stores/environmentStore';
import { CollectionRunnerView } from '../../src/components/CollectionRunnerView';
import { MatrixRunnerView } from '../../src/components/MatrixRunnerView';
import type { Collection, Request as ApiRequest } from '../../src/types/database';

const METHOD_COLORS: Record<string, string> = {
  GET: '#22C55E',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  PATCH: '#A855F7',
  DELETE: '#EF4444',
  HEAD: '#64748B',
  OPTIONS: '#EC4899',
};

export default function CollectionsScreen() {
  const {
    workspaces,
    collections,
    requests,
    activeWorkspaceId,
    expandedCollections,
    isLoading,
    loadWorkspaces,
    loadCollections,
    loadRequests,
    setActiveWorkspace,
    toggleCollection,
    setSelectedRequest,
    createWorkspace,
    deleteWorkspace,
    createCollection,
    deleteCollection,
    deleteRequest,
  } = useCollectionsStore();

  const { openRunner } = useRunnerStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'workspace' | 'collection' | null>(null);
  const [newName, setNewName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [matrixCollectionId, setMatrixCollectionId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadCollections(activeWorkspaceId);
      useEnvironmentStore.getState().loadEnvironments(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkspaces();
    if (activeWorkspaceId) {
      await loadCollections(activeWorkspaceId);
    }
    setRefreshing(false);
  }, [activeWorkspaceId]);

  const handleExpandCollection = async (col: Collection) => {
    toggleCollection(col.id);
    if (!expandedCollections.has(col.id)) {
      await loadRequests(col.id);
    }
  };

  const handleTapRequest = (req: ApiRequest) => {
    setSelectedRequest(req);
    router.navigate('/client');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    if (createType === 'workspace') {
      await createWorkspace(newName.trim());
    } else if (createType === 'collection' && activeWorkspaceId) {
      await createCollection(activeWorkspaceId, newName.trim());
    }

    setNewName('');
    setShowCreateModal(false);
    setCreateType(null);
  };

  const handleDeleteCollection = (col: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${col.name}" and all its requests?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCollection(col.id, activeWorkspaceId!),
        },
      ]
    );
  };

  const handleDeleteRequest = (req: ApiRequest) => {
    Alert.alert('Delete Request', `Delete "${req.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRequest(req.id, req.collection_id),
      },
    ]);
  };

  const activeCollections = activeWorkspaceId
    ? collections[activeWorkspaceId] ?? []
    : [];

  if (isLoading && workspaces.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Workspace Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.workspaceBar}
        contentContainerStyle={styles.workspaceBarContent}
      >
        {workspaces.map((ws) => (
          <TouchableOpacity
            key={ws.id}
            style={[
              styles.wsPill,
              activeWorkspaceId === ws.id && styles.wsPillActive,
            ]}
            onPress={() => setActiveWorkspace(ws.id)}
            onLongPress={() =>
              Alert.alert('Delete Workspace', `Delete "${ws.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteWorkspace(ws.id),
                },
              ])
            }
          >
            <Ionicons
              name="briefcase"
              size={14}
              color={activeWorkspaceId === ws.id ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.wsPillText,
                activeWorkspaceId === ws.id && styles.wsPillTextActive,
              ]}
            >
              {ws.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.wsAddPill}
          onPress={() => {
            setCreateType('workspace');
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={18} color="#6366F1" />
        </TouchableOpacity>
      </ScrollView>

      {/* Collections Tree */}
      {activeCollections.length === 0 ? (
        <ScrollView
          style={styles.treeScroll}
          contentContainerStyle={styles.treeContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
        >
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={56} color="#334155" />
            <Text style={styles.emptyTitle}>No Collections</Text>
            <Text style={styles.emptySubtitle}>
              Create a collection to organize your API requests.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          style={styles.treeScroll}
          contentContainerStyle={styles.treeContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
          sections={activeCollections.map((col) => {
            const isExpanded = expandedCollections.has(col.id);
            const colRequests = requests[col.id] ?? [];
            let data: any[] = [];
            if (isExpanded) {
              data = colRequests.length === 0 ? [{ type: 'empty', id: `empty-${col.id}` }] : colRequests;
            }
            return {
              collection: col,
              isExpanded,
              data,
              colRequestsCount: colRequests.length,
              colRequests,
            };
          })}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { collection, isExpanded, colRequestsCount, colRequests } }) => (
            <View style={[styles.collectionBlock, { borderBottomLeftRadius: isExpanded ? 0 : 12, borderBottomRightRadius: isExpanded ? 0 : 12, marginBottom: isExpanded ? 0 : 8 }]}>
              <TouchableOpacity
                style={styles.collectionHeader}
                onPress={() => handleExpandCollection(collection)}
                onLongPress={() => handleDeleteCollection(collection)}
              >
                <View style={styles.collectionLeft}>
                  <Ionicons
                    name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={16}
                    color="#64748B"
                  />
                  <Ionicons
                    name={isExpanded ? 'folder-open' : 'folder'}
                    size={18}
                    color="#6366F1"
                  />
                  <Text style={styles.collectionName}>{collection.name}</Text>
                </View>
                <View style={styles.collectionRight}>
                  {colRequestsCount > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.runBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setMatrixCollectionId(collection.id);
                        }}
                      >
                        <Ionicons name="apps-outline" size={16} color="#6366F1" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.runBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          openRunner(collection.id, colRequests);
                        }}
                      >
                        <Ionicons name="play" size={16} color="#6366F1" />
                      </TouchableOpacity>
                      <View style={styles.countChip}>
                        <Text style={styles.countChipText}>{colRequestsCount}</Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}
          renderSectionFooter={({ section: { isExpanded } }) => (
            isExpanded ? <View style={{ height: 8 }} /> : null
          )}
          renderItem={({ item, section }) => {
            if (item.type === 'empty') {
              return (
                <View style={[styles.requestsList, { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: 'rgba(30, 41, 59, 0.7)', borderWidth: 1, borderColor: '#334155', borderTopWidth: 0 }]}>
                  <Text style={styles.noRequests}>No requests in this collection</Text>
                </View>
              );
            }

            const req = item as ApiRequest;
            const isLast = section.data[section.data.length - 1].id === req.id;
            
            return (
              <TouchableOpacity
                style={[
                  styles.requestItem, 
                  { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#334155' },
                  isLast && { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 1 }
                ]}
                onPress={() => handleTapRequest(req)}
                onLongPress={() => handleDeleteRequest(req)}
              >
                <View
                  style={[
                    styles.methodBadge,
                    { backgroundColor: (METHOD_COLORS[req.method] ?? '#64748B') + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.methodBadgeText,
                      { color: METHOD_COLORS[req.method] ?? '#64748B' },
                    ]}
                  >
                    {req.method}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName} numberOfLines={1}>
                    {req.name}
                  </Text>
                  <Text style={styles.requestUrl} numberOfLines={1}>
                    {req.url || 'No URL'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setCreateType('collection');
          setShowCreateModal(true);
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>
              {createType === 'workspace'
                ? 'New Workspace'
                : 'New Collection'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={
                createType === 'workspace'
                  ? 'Workspace name'
                  : 'Collection name'
              }
              placeholderTextColor="#475569"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              autoCapitalize="words"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateBtn}
                onPress={handleCreate}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <CollectionRunnerView />
      <MatrixRunnerView 
        collectionId={matrixCollectionId} 
        onClose={() => setMatrixCollectionId(null)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  workspaceBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  wsPillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  wsPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  wsPillTextActive: {
    color: '#FFFFFF',
  },
  wsAddPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  treeScroll: {
    flex: 1,
  },
  treeContent: {
    padding: 12,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E2E8F0',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
    lineHeight: 20,
  },
  collectionBlock: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  collectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  collectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collectionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
  },
  runBtn: {
    padding: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countChip: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestsList: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 4,
  },
  noRequests: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3A4F',
  },
  methodBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 52,
    alignItems: 'center',
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  requestInfo: {
    flex: 1,
    gap: 2,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  requestUrl: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modalCreateBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCreateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

