import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { useState } from 'react';
import type { HttpMethod } from '../types/database';

const METHODS: { method: HttpMethod; color: string }[] = [
  { method: 'GET', color: '#22C55E' },
  { method: 'POST', color: '#3B82F6' },
  { method: 'PUT', color: '#F59E0B' },
  { method: 'PATCH', color: '#A855F7' },
  { method: 'DELETE', color: '#EF4444' },
  { method: 'HEAD', color: '#64748B' },
  { method: 'OPTIONS', color: '#EC4899' },
];

interface Props {
  method: HttpMethod;
  onSelect: (method: HttpMethod) => void;
}

export function MethodSelector({ method, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const selected = METHODS.find((m) => m.method === method) ?? METHODS[0];

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, { color: selected.color }]}>
          {selected.method}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>HTTP Method</Text>
            <FlatList
              data={METHODS}
              keyExtractor={(item) => item.method}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    item.method === method && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onSelect(item.method);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      { color: item.color },
                      item.method === method && styles.dropdownItemTextActive,
                    ]}
                  >
                    {item.method}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 20,
    width: 260,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemActive: {
    backgroundColor: '#334155',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownItemTextActive: {
    color: '#F1F5F9',
  },
});
