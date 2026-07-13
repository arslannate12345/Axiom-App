import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '../../src/components/AnimatedBackground';
import { useEnvironmentStore, GLOBAL_ENV_ID } from '../../src/stores/environmentStore';
import type { EnvironmentVariable } from '../../src/types/database';

export default function EnvironmentsScreen() {
  const { variables, setVariables } = useEnvironmentStore();
  const currentVars = variables[GLOBAL_ENV_ID] || [];

  const addVariable = () => {
    const newVar: EnvironmentVariable = {
      id: Math.random().toString(36).substr(2, 9),
      environment_id: GLOBAL_ENV_ID,
      key: '',
      value: '',
      is_secret: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setVariables(GLOBAL_ENV_ID, [...currentVars, newVar]);
  };

  const updateVariable = (id: string, field: 'key' | 'value', text: string) => {
    const updated = currentVars.map(v => 
      v.id === id ? { ...v, [field]: text, updated_at: new Date().toISOString() } : v
    );
    setVariables(GLOBAL_ENV_ID, updated);
  };

  const removeVariable = (id: string) => {
    const updated = currentVars.filter(v => v.id !== id);
    setVariables(GLOBAL_ENV_ID, updated);
  };

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Environments</Text>
            <Text style={styles.subtitle}>Global Variables</Text>
          </View>
          <TouchableOpacity onPress={addVariable} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add Variable</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="globe-outline" size={20} color="#6366F1" />
              <Text style={styles.cardTitle}>Global Scope</Text>
            </View>
            <Text style={styles.cardDescription}>
              These variables are available across all your requests. Use them in URLs, Headers, or Bodies by typing <Text style={styles.code}>{'{{variable_name}}'}</Text>.
            </Text>

            <View style={styles.variablesContainer}>
              {currentVars.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No variables defined yet.</Text>
                </View>
              ) : (
                currentVars.map((v, index) => (
                  <View key={v.id} style={styles.variableRow}>
                    <TextInput
                      style={styles.inputKey}
                      placeholder="Key (e.g. baseUrl)"
                      placeholderTextColor="#475569"
                      value={v.key}
                      onChangeText={(text) => updateVariable(v.id, 'key', text)}
                      autoCapitalize="none"
                    />
                    <Text style={styles.equals}>=</Text>
                    <TextInput
                      style={styles.inputValue}
                      placeholder="Value"
                      placeholderTextColor="#475569"
                      value={v.value}
                      onChangeText={(text) => updateVariable(v.id, 'value', text)}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => removeVariable(v.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginLeft: 8,
  },
  cardDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  code: {
    fontFamily: 'monospace',
    color: '#818CF8',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 4,
    borderRadius: 4,
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
