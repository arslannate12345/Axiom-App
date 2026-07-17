import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { AssertionRow, AssertionOperator } from '../types/assertions';
import { ASSERTION_OPERATORS } from '../types/assertions';

interface Props {
  assertions: AssertionRow[];
  onChange: (assertions: AssertionRow[]) => void;
}

const FIELD_PRESETS = [
  { value: 'status', label: 'Status Code' },
  { value: 'totalTime', label: 'Total Time' },
  { value: 'ttfb', label: 'TTFB' },
  { value: 'size', label: 'Size' },
  { value: 'body', label: 'Body' },
];

const VALUE_PRESETS: Record<string, {label: string, value: string}[]> = {
  status: [
    { label: '200 OK', value: '200' },
    { label: '201 Created', value: '201' },
    { label: '400 Bad Req', value: '400' },
    { label: '401 Unauth', value: '401' },
    { label: '404 Not Found', value: '404' },
    { label: '500 Error', value: '500' },
  ],
  totalTime: [
    { label: '100ms', value: '100' },
    { label: '200ms', value: '200' },
    { label: '500ms', value: '500' },
    { label: '1000ms', value: '1000' },
  ],
  ttfb: [
    { label: '50ms', value: '50' },
    { label: '100ms', value: '100' },
    { label: '200ms', value: '200' },
  ],
  header: [
    { label: 'application/json', value: 'application/json' },
    { label: 'text/html', value: 'text/html' },
  ],
};

/** Whether the given operator needs an expected value input */
function operatorNeedsValue(op: AssertionOperator): boolean {
  return op !== 'exists' && op !== 'notExists';
}

/** Build the complete field string from user selections */
function buildFieldString(fieldType: string, subfield: string): string {
  if (fieldType === 'header' && subfield.trim()) {
    return `header.${subfield.trim()}`;
  }
  if (fieldType === 'jsonpath' && subfield.trim()) {
    return `jsonpath:${subfield.trim()}`;
  }
  return fieldType;
}

/** Parse a stored field string back into type + subfield */
function parseFieldString(field: string): { type: string; subfield: string } {
  if (field.startsWith('header.')) {
    return { type: 'header', subfield: field.slice(7) };
  }
  if (field.startsWith('jsonpath:')) {
    return { type: 'jsonpath', subfield: field.slice(9) };
  }
  return { type: field, subfield: '' };
}

export function AssertionEditor({ assertions, onChange }: Props) {
  const [showOperatorPicker, setShowOperatorPicker] = useState<number | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState<number | null>(null);

  const addAssertion = () => {
    onChange([
      ...assertions,
      { field: 'status', operator: 'equals', expected_value: '200', enabled: true },
    ]);
  };

  const removeAssertion = (index: number) => {
    onChange(assertions.filter((_, i) => i !== index));
  };

  const updateAssertion = (
    index: number,
    updates: Partial<AssertionRow>
  ) => {
    const updated = [...assertions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const toggleEnabled = (index: number) => {
    updateAssertion(index, { enabled: !assertions[index].enabled });
  };

  const setFieldType = (index: number, fieldType: string) => {
    const { subfield } = parseFieldString(assertions[index].field);
    updateAssertion(index, { field: buildFieldString(fieldType, subfield) });
    setShowFieldPicker(null);
  };

  const setSubfield = (index: number, subfield: string) => {
    const { type } = parseFieldString(assertions[index].field);
    updateAssertion(index, { field: buildFieldString(type, subfield) });
  };

  const setOperator = (index: number, operator: AssertionOperator) => {
    updateAssertion(index, { operator });
    setShowOperatorPicker(null);
  };

  return (
    <View style={styles.container}>
      {assertions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#475569" />
          <Text style={styles.emptyText}>No assertions configured</Text>
          <Text style={styles.emptySubtext}>
            Add assertions to automatically validate API responses
          </Text>
        </View>
      ) : null}

      {assertions.map((assertion, i) => {
        const { type: fieldType, subfield } = parseFieldString(assertion.field);
        const needsSubfield = fieldType === 'header' || fieldType === 'jsonpath';
        const needsValue = operatorNeedsValue(assertion.operator);
        const fieldLabel =
          FIELD_PRESETS.find((f) => f.value === fieldType)?.label ??
          (fieldType === 'header' ? 'Header' : fieldType === 'jsonpath' ? 'JSONPath' : fieldType);
        const opLabel =
          ASSERTION_OPERATORS.find((o) => o.value === assertion.operator)?.label ??
          assertion.operator;

        return (
          <View
            key={`assertion-${i}`}
            style={[styles.assertionCard, !assertion.enabled && styles.assertionCardDisabled]}
          >
            {/* Top row: enable toggle + field selector + delete */}
            <View style={styles.topRow}>
              <TouchableOpacity
                style={[styles.checkbox, assertion.enabled && styles.checkboxActive]}
                onPress={() => toggleEnabled(i)}
              >
                {assertion.enabled && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fieldSelector}
                onPress={() => setShowFieldPicker(showFieldPicker === i ? null : i)}
              >
                <Text style={styles.fieldSelectorText}>{fieldLabel}</Text>
                <Ionicons name="chevron-down" size={14} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.operatorSelector}
                onPress={() => setShowOperatorPicker(showOperatorPicker === i ? null : i)}
              >
                <Text style={styles.operatorSelectorText}>{opLabel}</Text>
                <Ionicons name="chevron-down" size={14} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeAssertion(i)}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {/* Field picker dropdown */}
            {showFieldPicker === i && (
              <View style={styles.dropdown}>
                {[...FIELD_PRESETS, { value: 'header', label: 'Response Header' }, { value: 'jsonpath', label: 'JSONPath (body)' }].map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.dropdownItem, fieldType === f.value && styles.dropdownItemActive]}
                    onPress={() => setFieldType(i, f.value)}
                  >
                    <Text style={[styles.dropdownItemText, fieldType === f.value && styles.dropdownItemTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Operator picker dropdown */}
            {showOperatorPicker === i && (
              <View style={styles.dropdown}>
                {ASSERTION_OPERATORS.map((op) => (
                  <TouchableOpacity
                    key={op.value}
                    style={[styles.dropdownItem, assertion.operator === op.value && styles.dropdownItemActive]}
                    onPress={() => setOperator(i, op.value)}
                  >
                    <Text style={[styles.dropdownItemText, assertion.operator === op.value && styles.dropdownItemTextActive]}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Subfield input (for header name or JSONPath expression) */}
            {needsSubfield && (
              <TextInput
                style={styles.subfieldInput}
                placeholder={fieldType === 'header' ? 'Header name (e.g. content-type)' : 'JSONPath (e.g. $.data.token)'}
                placeholderTextColor="#475569"
                value={subfield}
                onChangeText={(text) => setSubfield(i, text)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}

            {/* Expected value input */}
            {needsValue && (
              <View style={styles.expectedValueContainer}>
                {VALUE_PRESETS[fieldType] && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                    {VALUE_PRESETS[fieldType].map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.presetChip}
                        onPress={() => updateAssertion(i, { expected_value: preset.value })}
                      >
                        <Text style={styles.presetChipText}>{preset.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <TextInput
                  style={styles.expectedInput}
                  placeholder="Expected value"
                  placeholderTextColor="#475569"
                  value={assertion.expected_value}
                  onChangeText={(text) => updateAssertion(i, { expected_value: text })}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
          </View>
        );
      })}

      {/* Add assertion button */}
      <TouchableOpacity style={styles.addBtn} onPress={addAssertion}>
        <Ionicons name="add-circle-outline" size={18} color="#6366F1" />
        <Text style={styles.addBtnText}>Add Assertion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  assertionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 10,
  },
  assertionCardDisabled: {
    opacity: 0.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
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
    fontSize: 13,
    fontWeight: '700',
  },
  fieldSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldSelectorText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  operatorSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  operatorSelectorText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3A4F',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  dropdownItemText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#818CF8',
    fontWeight: '700',
  },
  subfieldInput: {
    marginTop: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    fontFamily: 'monospace',
  },
  expectedInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  expectedValueContainer: {
    marginTop: 8,
  },
  presetsScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  presetChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  presetChipText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
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
});
