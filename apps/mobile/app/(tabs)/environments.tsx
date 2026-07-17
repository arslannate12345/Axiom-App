import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useEnvironmentStore } from '../../src/stores/environmentStore';
import { useCollectionsStore } from '../../src/stores/collectionsStore';
import * as dataService from '../../src/services/dataService';
import type { EnvironmentVariable, Environment } from '../../src/types/database';

export default function EnvironmentsScreen() {
  const { environments, variables, setVariables, loadEnvironments } = useEnvironmentStore();
  const { activeWorkspaceId } = useCollectionsStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [showCreateEnv, setShowCreateEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  useEffect(() => {
    if (!selectedEnvId && environments.length > 0) {
      const globalEnv = environments.find(e => e.name === 'Global');
      setSelectedEnvId(globalEnv ? globalEnv.id : environments[0].id);
    }
  }, [environments, selectedEnvId]);

  const currentVars = selectedEnvId ? (variables[selectedEnvId] || []) : [];
  const currentEnv = environments.find(e => e.id === selectedEnvId);

  const addVariable = async () => {
    if (!selectedEnvId) return;
    const newVar = await dataService.upsertEnvironmentVariable(selectedEnvId, '', '');
    if (newVar) {
      setVariables(selectedEnvId, [...currentVars, newVar]);
    }
  };

  const updateLocalVariable = (id: string, field: 'key' | 'value', text: string) => {
    if (!selectedEnvId) return;
    const updated = currentVars.map(v => 
      v.id === id ? { ...v, [field]: text, updated_at: new Date().toISOString() } : v
    );
    setVariables(selectedEnvId, updated);
  };

  const saveVariableToDb = async (v: EnvironmentVariable) => {
    await dataService.upsertEnvironmentVariable(v.environment_id, v.key, v.value, v.is_secret, v.id);
  };

  const removeVariable = async (id: string) => {
    if (!selectedEnvId) return;
    const success = await dataService.deleteEnvironmentVariable(id);
    if (success) {
      const updated = currentVars.filter(v => v.id !== id);
      setVariables(selectedEnvId, updated);
    }
  };

  const createEnv = async () => {
    if (!newEnvName.trim() || !activeWorkspaceId) return;
    const env = await dataService.createEnvironment(activeWorkspaceId, newEnvName.trim());
    if (env) {
      setNewEnvName('');
      setShowCreateEnv(false);
      await loadEnvironments(activeWorkspaceId);
      setSelectedEnvId(env.id);
    }
  };

  const deleteEnv = (env: Environment) => {
    if (env.name === 'Global') {
      Alert.alert('Cannot Delete', 'The Global environment cannot be deleted.');
      return;
    }
    Alert.alert('Delete Environment', `Are you sure you want to delete '${env.name}'?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const success = await dataService.deleteEnvironment(env.id);
          if (success && activeWorkspaceId) {
            await loadEnvironments(activeWorkspaceId);
            setSelectedEnvId(null);
          }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={1}>Environments</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Manage environments and variables</Text>
          </View>
          <TouchableOpacity onPress={() => setShowCreateEnv(true)} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {showCreateEnv && (
          <View style={styles.createEnvRow}>
            <TextInput
              style={styles.createEnvInput}
              placeholder="Environment Name (e.g. Staging)"
              placeholderTextColor="#64748B"
              value={newEnvName}
              onChangeText={setNewEnvName}
              autoFocus
              onSubmitEditing={createEnv}
            />
            <TouchableOpacity style={styles.createEnvSaveBtn} onPress={createEnv}>
              <Text style={styles.createEnvSaveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createEnvCancelBtn} onPress={() => setShowCreateEnv(false)}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.envSelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.envSelectorScroll}>
            {environments.map(env => (
              <TouchableOpacity
                key={env.id}
                style={[styles.envChip, selectedEnvId === env.id && styles.envChipActive]}
                onPress={() => setSelectedEnvId(env.id)}
              >
                <Text style={[styles.envChipText, selectedEnvId === env.id && styles.envChipTextActive]}>
                  {env.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentEnv && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={currentEnv.name === 'Global' ? "globe-outline" : "server-outline"} size={20} color="#6366F1" />
                  <Text style={styles.cardTitle}>{currentEnv.name}</Text>
                </View>
                {currentEnv.name !== 'Global' && (
                  <TouchableOpacity onPress={() => deleteEnv(currentEnv)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.cardDescription}>
                {currentEnv.name === 'Global' 
                  ? "Global variables are always available as fallbacks."
                  : `Variables specific to ${currentEnv.name}. These override Global variables.`
                }
              </Text>

              <View style={styles.variablesContainer}>
                {currentVars.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No variables defined yet.</Text>
                  </View>
                ) : (
                  currentVars.map((v) => (
                    <View key={v.id} style={styles.variableRow}>
                      <TextInput
                        style={styles.inputKey}
                        placeholder="Key (e.g. baseUrl)"
                        placeholderTextColor="#475569"
                        value={v.key}
                        onChangeText={(text) => updateLocalVariable(v.id, 'key', text)}
                        onEndEditing={() => saveVariableToDb(v)}
                        autoCapitalize="none"
                      />
                      <Text style={styles.equals}>=</Text>
                      <TextInput
                        style={styles.inputValue}
                        placeholder="Value"
                        placeholderTextColor="#475569"
                        value={v.value}
                        onChangeText={(text) => updateLocalVariable(v.id, 'value', text)}
                        onEndEditing={() => saveVariableToDb(v)}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => removeVariable(v.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                
                <TouchableOpacity style={styles.addVarBtn} onPress={addVariable}>
                  <Ionicons name="add-circle-outline" size={20} color="#818CF8" />
                  <Text style={styles.addVarBtnText}>Add Variable</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#F1F5F9' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  
  createEnvRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  createEnvInput: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  createEnvSaveBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  createEnvSaveText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  createEnvCancelBtn: {
    padding: 8,
    marginLeft: 4,
  },
  
  envSelectorContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  envSelectorScroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 8,
  },
  envChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  envChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
  envChipText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  envChipTextActive: { color: '#818CF8' },

  scrollContent: { padding: 16 },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  cardDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  variablesContainer: {
    gap: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  variableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputKey: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F1F5F9',
    fontSize: 14,
  },
  equals: {
    color: '#64748B',
    marginHorizontal: 8,
    fontWeight: '700',
  },
  inputValue: {
    flex: 2,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#10B981',
    fontSize: 14,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 4,
  },
});
