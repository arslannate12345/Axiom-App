import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { KeyValuePair } from '../types/database';

interface Props {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  suggestedKeys?: string[];
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  suggestedKeys,
}: Props) {
  const updatePair = (index: number, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    const updated = [...pairs];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const addPair = () => {
    onChange([...pairs, { key: '', value: '', enabled: true }]);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {pairs.map((pair, i) => (
        <View key={`${i}-${pair.key}`} style={styles.row}>
          <TouchableOpacity
            style={[styles.checkbox, pair.enabled && styles.checkboxActive]}
            onPress={() => updatePair(i, 'enabled', !pair.enabled)}
          >
            {pair.enabled && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          <TextInput
            style={[styles.input, styles.keyInput]}
            placeholder={keyPlaceholder}
            placeholderTextColor="#475569"
            value={pair.key}
            onChangeText={(text) => updatePair(i, 'key', text)}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.valueInput]}
            placeholder={valuePlaceholder}
            placeholderTextColor="#475569"
            value={pair.value}
            onChangeText={(text) => updatePair(i, 'value', text)}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.removeBtn} onPress={() => removePair(i)}>
            <Text style={styles.removeBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={addPair}>
        <Text style={styles.addBtnText}>+ Add</Text>
      </TouchableOpacity>

      {suggestedKeys && suggestedKeys.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsContainer}>
          {suggestedKeys.map((s) => (
            <TouchableOpacity 
              key={s} 
              style={styles.suggestionChip}
              onPress={() => onChange([...pairs, { key: s, value: '', enabled: true }])}
            >
              <Text style={styles.suggestionText}>+ {s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    flex: 1,
  },
  keyInput: {
    flex: 1,
  },
  valueInput: {
    flex: 1.5,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '600',
  },
  addBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addBtnText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  suggestionChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
});
