import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCollectionsStore } from '../stores/collectionsStore';
import type { HttpMethod, BodyType, KeyValuePair } from '../types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (requestId: string) => void;
  currentRequestId?: string | null;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  body: string | null;
}

export function SaveRequestModal({
  visible,
  onClose,
  onSaved,
  currentRequestId,
  method,
  url,
  headers,
  queryParams,
  bodyType,
  body,
}: Props) {
  const {
    workspaces,
    collections,
    activeWorkspaceId,
    loadWorkspaces,
    loadCollections,
    createWorkspace,
    createCollection,
    saveRequest,
    updateRequest,
  } = useCollectionsStore();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [requestName, setRequestName] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadWorkspaces();
      setSelectedWorkspaceId(activeWorkspaceId);
      setRequestName(url ? `${method} ${new URL(url).pathname}` : '');
    }
  }, [visible]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      loadCollections(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  const workspaceCollections = selectedWorkspaceId
    ? collections[selectedWorkspaceId] ?? []
    : [];

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    const ws = await createWorkspace(newWorkspaceName.trim());
    if (ws) {
      setSelectedWorkspaceId(ws.id);
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !selectedWorkspaceId) return;
    const col = await createCollection(selectedWorkspaceId, newCollectionName.trim());
    if (col) {
      setSelectedCollectionId(col.id);
      setNewCollectionName('');
      setShowNewCollection(false);
    }
  };

  const handleSave = async () => {
    if (!requestName.trim()) {
      Alert.alert('Validation', 'Please enter a request name.');
      return;
    }
    if (!selectedCollectionId) {
      Alert.alert('Validation', 'Please select or create a collection.');
      return;
    }

    setSaving(true);

    // Always Save as New
    const req = await saveRequest({
      collectionId: selectedCollectionId,
      name: requestName.trim(),
      method,
      url,
      headers,
      queryParams,
      bodyType,
      body,
    });
    setSaving(false);
    if (req) {
      onSaved(req.id);
      onClose();
    } else {
      Alert.alert('Error', 'Failed to save request.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              Add Request
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Request Name */}
            <Text style={styles.label}>Request Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Get Users"
              placeholderTextColor="#475569"
              value={requestName}
              onChangeText={setRequestName}
              autoCapitalize="words"
            />

            {/* Workspace Picker */}
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Workspace</Text>
              <TouchableOpacity onPress={() => setShowNewWorkspace(!showNewWorkspace)}>
                <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
              </TouchableOpacity>
            </View>

            {showNewWorkspace && (
              <View style={styles.inlineCreate}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="New workspace name"
                  placeholderTextColor="#475569"
                  value={newWorkspaceName}
                  onChangeText={setNewWorkspaceName}
                />
                <TouchableOpacity
                  style={styles.inlineCreateBtn}
                  onPress={handleCreateWorkspace}
                >
                  <Ionicons name="checkmark" size={20} color="#22C55E" />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillRow}
            >
              {workspaces.map((ws) => (
                <TouchableOpacity
                  key={ws.id}
                  style={[
                    styles.pill,
                    selectedWorkspaceId === ws.id && styles.pillActive,
                  ]}
                  onPress={() => {
                    setSelectedWorkspaceId(ws.id);
                    setSelectedCollectionId(null);
                  }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedWorkspaceId === ws.id && styles.pillTextActive,
                    ]}
                  >
                    {ws.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Collection Picker */}
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Collection</Text>
              <TouchableOpacity onPress={() => setShowNewCollection(!showNewCollection)}>
                <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
              </TouchableOpacity>
            </View>

            {showNewCollection && (
              <View style={styles.inlineCreate}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="New collection name"
                  placeholderTextColor="#475569"
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                />
                <TouchableOpacity
                  style={styles.inlineCreateBtn}
                  onPress={handleCreateCollection}
                >
                  <Ionicons name="checkmark" size={20} color="#22C55E" />
                </TouchableOpacity>
              </View>
            )}

            {workspaceCollections.length === 0 ? (
              <Text style={styles.emptyHint}>
                No collections yet. Create one above.
              </Text>
            ) : (
              workspaceCollections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[
                    styles.collectionItem,
                    selectedCollectionId === col.id && styles.collectionItemActive,
                  ]}
                  onPress={() => setSelectedCollectionId(col.id)}
                >
                  <Ionicons
                    name="folder"
                    size={18}
                    color={
                      selectedCollectionId === col.id ? '#6366F1' : '#64748B'
                    }
                  />
                  <Text
                    style={[
                      styles.collectionItemText,
                      selectedCollectionId === col.id &&
                        styles.collectionItemTextActive,
                    ]}
                  >
                    {col.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                Add
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  inlineCreate: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  inlineCreateBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillRow: {
    marginBottom: 4,
    maxHeight: 44,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  collectionItemActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  collectionItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  collectionItemTextActive: {
    color: '#F1F5F9',
  },
  emptyHint: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  saveBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
