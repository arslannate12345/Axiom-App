import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '../../src/components/AnimatedBackground';
import { useHistoryStore } from '../../src/stores/historyStore';
import { useCollectionsStore } from '../../src/stores/collectionsStore';
import type { HistoryEntry } from '../../src/types/database';

export default function HistoryScreen() {
  const { entries, isLoading, loadHistory, clearHistory, removeEntry } = useHistoryStore();
  const { requests } = useCollectionsStore();

  useEffect(() => {
    loadHistory(50);
  }, []);

  const allRequests = useMemo(() => {
    return Object.values(requests).flat();
  }, [requests]);

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const requestDetails = allRequests.find(req => req.id === item.request_id);
    const method = requestDetails?.method || 'UNK';
    const name = requestDetails?.name || 'Unknown Request';
    const isError = !item.status_code || item.status_code >= 400;

    const confirmDelete = () => {
      Alert.alert(
        'Delete Request',
        'Are you sure you want to remove this request from your history?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => removeEntry(item.id) },
        ]
      );
    };

    return (
      <TouchableOpacity 
        style={styles.historyCard} 
        onLongPress={confirmDelete}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        <View style={styles.historyHeader}>
          <View style={[styles.methodBadge, { backgroundColor: getMethodColor(method) }]}>
            <Text style={styles.methodText}>{method}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isError ? '#EF4444' : '#10B981' }]} />
            <Text style={[styles.statusText, { color: isError ? '#EF4444' : '#10B981' }]}>
              {item.status_code || 'ERR'}
            </Text>
          </View>
        </View>

        <Text style={styles.requestName} numberOfLines={1}>{name}</Text>
        
        <View style={styles.historyFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={14} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.footerText}>
              {new Date(item.executed_at).toLocaleString()}
            </Text>
          </View>
          {item.latency_ms !== null && (
            <View style={styles.footerItem}>
              <Ionicons name="flash-outline" size={14} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={styles.footerText}>{item.latency_ms} ms</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>History</Text>
          <TouchableOpacity onPress={() => clearHistory()} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {isLoading && entries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color="#334155" />
                <Text style={styles.emptyText}>No history available yet.</Text>
                <Text style={styles.emptySubtext}>Save and run requests to see them here.</Text>
              </View>
            }
          />
        )}
      </View>
    </AnimatedBackground>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  historyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  methodText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  emptyText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },
});
