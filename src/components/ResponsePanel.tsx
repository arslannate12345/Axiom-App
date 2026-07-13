import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { getStatusColor, getStatusLabel, formatBytes, formatMs } from '../services/networkService';
import type { ResponseTiming } from '../services/networkService';

interface Props {
  response: ResponseTiming | null;
  error: string | null;
}

type ResponseTab = 'body' | 'headers';

export function ResponsePanel({ response, error }: Props) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');

  if (!response && !error) return null;

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBadge}>
          <Text style={styles.errorBadgeText}>Error</Text>
        </View>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!response) return null;

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderJsonNode = (key: string, value: unknown, path: string, depth: number) => {
    const isExpanded = expandedNodes.has(path);
    const indent = depth * 16;
    const isObject = typeof value === 'object' && value !== null;
    const isArray = Array.isArray(value);

    if (!isObject) {
      const displayValue =
        typeof value === 'string' ? `"${value}"` : String(value ?? 'null');
      return (
        <View key={path} style={[styles.jsonRow, { paddingLeft: indent }]}>
          {key ? <Text style={styles.jsonKey}>{key}: </Text> : null}
          <Text style={styles.jsonValue}>{displayValue}</Text>
        </View>
      );
    }

    const entries = isArray
      ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(value as Record<string, unknown>);
    const bracket = isArray ? ['[', ']'] : ['{', '}'];

    return (
      <View key={path}>
        <TouchableOpacity
          style={[styles.jsonRow, { paddingLeft: indent }]}
          onPress={() => toggleNode(path)}
        >
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          {key ? <Text style={styles.jsonKey}>{key}: </Text> : null}
          <Text style={styles.jsonBracket}>
            {isExpanded ? bracket[0]
              : `${bracket[0]} ${entries.length} items ${bracket[1]}`}
          </Text>
        </TouchableOpacity>
        {isExpanded &&
          entries.map(([k, v]) =>
            renderJsonNode(k, v, `${path}.${k}`, depth + 1)
          )}
        {isExpanded && (
          <Text style={[styles.jsonBracket, { paddingLeft: indent }]}>
            {bracket[1]}
          </Text>
        )}
      </View>
    );
  };

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(response.body);
  } catch {
    parsedBody = response.body;
  }

  const isJson = typeof parsedBody === 'object' && parsedBody !== null;

  return (
    <View style={styles.container}>
      {/* Status & timing */}
      <View style={styles.metaRow}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(response.status) }]}>
          <Text style={styles.statusText}>
            {response.status} {getStatusLabel(response.status)}
          </Text>
        </View>
        <View style={styles.timingChip}>
          <Text style={styles.timingText}>{formatMs(response.totalTime)}</Text>
        </View>
        <View style={styles.timingChip}>
          <Text style={styles.timingText}>{formatBytes(response.size)}</Text>
        </View>
      </View>

      <View style={styles.timingDetail}>
        <Text style={styles.timingDetailText}>
          TTFB: {formatMs(response.ttfb)} · Total: {formatMs(response.totalTime)}
        </Text>
      </View>

      {/* Response tabs */}
      <View style={styles.responseTabBar}>
        <TouchableOpacity
          style={[styles.responseTab, activeTab === 'body' && styles.responseTabActive]}
          onPress={() => setActiveTab('body')}
        >
          <Text style={[styles.responseTabText, activeTab === 'body' && styles.responseTabTextActive]}>
            Body
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.responseTab, activeTab === 'headers' && styles.responseTabActive]}
          onPress={() => setActiveTab('headers')}
        >
          <Text style={[styles.responseTabText, activeTab === 'headers' && styles.responseTabTextActive]}>
            Headers ({Object.keys(response.headers).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={styles.bodySection}>
        {activeTab === 'body' ? (
          <ScrollView
            style={styles.bodyScroll}
            horizontal={false}
            nestedScrollEnabled
          >
            {isJson ? (
              <View style={styles.jsonTree}>
                {renderJsonNode('', parsedBody, 'root', 0)}
              </View>
            ) : (
              <ScrollView horizontal>
                <Text style={styles.rawBody} selectable>
                  {response.body || '(empty)'}
                </Text>
              </ScrollView>
            )}
          </ScrollView>
        ) : (
          <ScrollView style={styles.bodyScroll} nestedScrollEnabled>
            {Object.entries(response.headers).map(([key, value]) => (
              <View key={key} style={styles.headerRow}>
                <Text style={styles.headerKey} selectable>{key}</Text>
                <Text style={styles.headerValue} selectable>{value}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  timingChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  timingDetail: {
    marginBottom: 12,
  },
  timingDetailText: {
    color: '#64748B',
    fontSize: 12,
  },
  responseTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 8,
  },
  responseTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  responseTabActive: {
    borderBottomColor: '#6366F1',
  },
  responseTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  responseTabTextActive: {
    color: '#F1F5F9',
  },
  bodySection: {
    flex: 1,
    minHeight: 200,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3A4F',
  },
  headerKey: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#93C5FD',
    fontFamily: 'monospace',
  },
  headerValue: {
    flex: 1.5,
    fontSize: 13,
    color: '#CBD5E1',
    fontFamily: 'monospace',
  },
  bodyScroll: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 400,
    flexGrow: 0,
  },
  rawBody: {
    color: '#F1F5F9',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  jsonTree: {
    paddingVertical: 4,
  },
  jsonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
    flexWrap: 'wrap',
  },
  expandIcon: {
    color: '#64748B',
    fontSize: 10,
    marginRight: 4,
    marginTop: 2,
  },
  jsonKey: {
    color: '#93C5FD',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  jsonValue: {
    color: '#86EFAC',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  jsonBracket: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  errorBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  errorBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
});
