import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VariableExtraction } from '../types/runner';

export type VariableExtractionRow = Omit<VariableExtraction, 'id' | 'request_id' | 'sort_order'> & {
  enabled?: boolean; // UI only
};

interface Props {
  extractions: VariableExtractionRow[];
  onChange: (extractions: VariableExtractionRow[]) => void;
}

export function VariableExtractionEditor({ extractions, onChange }: Props) {
  const addExtraction = () => {
    onChange([
      ...extractions,
      { variable_name: 'new_var', json_path: '$.data.id', enabled: true },
    ]);
  };

  const removeExtraction = (index: number) => {
    onChange(extractions.filter((_, i) => i !== index));
  };

  const updateExtraction = (index: number, updates: Partial<VariableExtractionRow>) => {
    const updated = [...extractions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const toggleEnabled = (index: number) => {
    updateExtraction(index, { enabled: !extractions[index].enabled });
  };

  return (
    <View style={styles.container}>
      {extractions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No variable extractions configured.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {extractions.map((ext, i) => (
            <View
              key={i}
              style={[styles.row, ext.enabled === false && styles.rowDisabled]}
            >
              <View style={styles.rowHeader}>
                <TouchableOpacity onPress={() => toggleEnabled(i)} style={styles.checkbox}>
                  <Ionicons
                    name={ext.enabled !== false ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={ext.enabled !== false ? '#6366F1' : '#64748B'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => removeExtraction(i)}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputsContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Variable Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. authToken"
                    placeholderTextColor="#475569"
                    value={ext.variable_name}
                    onChangeText={(text) => updateExtraction(i, { variable_name: text })}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>JSONPath</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. $.data.token"
                    placeholderTextColor="#475569"
                    value={ext.json_path}
                    onChangeText={(text) => updateExtraction(i, { json_path: text })}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={addExtraction}>
        <Ionicons name="add" size={18} color="#6366F1" />
        <Text style={styles.addBtnText}>Add Extraction</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  list: {
    gap: 12,
    marginBottom: 16,
  },
  row: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 4,
  },
  inputsContainer: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#F1F5F9',
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#334155',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderStyle: 'dashed',
    gap: 8,
  },
  addBtnText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 14,
  },
});
