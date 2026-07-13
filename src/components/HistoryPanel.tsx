import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryStore } from '../stores/historyStore';
import { getStatusColor, formatMs, formatBytes } from '../services/networkService';

const METHOD_COLORS: Record<string, string> = {
  GET: '#22C55E',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  PATCH: '#A855F7',
  DELETE: '#EF4444',
  HEAD: '#64748B',
  OPTIONS: '#EC4899',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onReplay: (entry: {
    url: string;
    method: string;
    statusCode: number | null;
  }) => void;
}

export function HistoryPanel({ visible, onClose, onReplay }: Props) {
  const { entries, clearHistory } = useHistoryStore();

  if (!visible) return null;

  const renderEntry = ({ item }: { item: (typeof entries)[0] }) => {
    const methodColor = METHOD_COLORS[item.request_id ?? ''] ?? '#64748B';

    return (
      <TouchableOpacity
        style={styles.entry}
        onPress={() =>
          onReplay({
            url: '', // History entries don't store the URL directly — future improvement
            method: '',
            statusCode: item.status_code,
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.entryTop}>
          <View style={styles.entryMeta}>
            {item.status_code && (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(item.status_code) },
                ]}
              />
            )}
            <Text
              style={[
                styles.statusCode,
                {
                  color: item.status_code
                    ? getStatusColor(item.status_code)
                    : '#EF4444',
                },
              ]}
            >
              {item.status_code ?? 'ERR'}
            </Text>
            {item.latency_ms != null && (
              <Text style={styles.latency}>{formatMs(item.latency_ms)}</Text>
            )}
            {item.response_size != null && (
              <Text style={styles.size}>{formatBytes(item.response_size)}</Text>
            )}
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.executed_at).toLocaleTimeString()}
          </Text>
        </View>
        {item.error_message && (
          <Text style={styles.errorText} numberOfLines={1}>
            {item.error_message}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={18} color="#94A3B8" />
          <Text style={styles.headerTitle}>History</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{entries.length}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {entries.length > 0 && (
            <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-down" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="hourglass-outline" size={32} color="#334155" />
          <Text style={styles.emptyText}>No history yet</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 280,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  list: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  entry: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3A4F',
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCode: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  latency: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  size: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  timestamp: {
    fontSize: 11,
    color: '#475569',
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
  },
});
