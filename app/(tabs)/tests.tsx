import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useState } from 'react';
import { BenchmarkSuite } from '../../src/components/tests/BenchmarkSuite';
import { RegressionSuite } from '../../src/components/tests/RegressionSuite';
import { FuzzSuite } from '../../src/components/tests/FuzzSuite';
import { SecuritySuite } from '../../src/components/tests/SecuritySuite';

type TestSuite = 'benchmarks' | 'contracts' | 'fuzzing' | 'security';

export default function TestsScreen() {
  const [activeSuite, setActiveSuite] = useState<TestSuite>('benchmarks');

  return (
    <View style={styles.container}>
        {/* Top Scrollable Tab Bar for Suites */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
            <TouchableOpacity
              style={[styles.tabBtn, activeSuite === 'benchmarks' && styles.tabBtnActive]}
              onPress={() => setActiveSuite('benchmarks')}
            >
              <Text style={[styles.tabText, activeSuite === 'benchmarks' && styles.tabTextActive]}>
                Benchmarks
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tabBtn, activeSuite === 'contracts' && styles.tabBtnActive]}
              onPress={() => setActiveSuite('contracts')}
            >
              <Text style={[styles.tabText, activeSuite === 'contracts' && styles.tabTextActive]}>
                Contracts & Regression
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeSuite === 'fuzzing' && styles.tabBtnActive]}
              onPress={() => setActiveSuite('fuzzing')}
            >
              <Text style={[styles.tabText, activeSuite === 'fuzzing' && styles.tabTextActive]}>
                Fuzzing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeSuite === 'security' && styles.tabBtnActive]}
              onPress={() => setActiveSuite('security')}
            >
              <Text style={[styles.tabText, activeSuite === 'security' && styles.tabTextActive]}>
                Security
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Suite Content */}
        <View style={styles.suiteContent}>
          {activeSuite === 'benchmarks' && <BenchmarkSuite />}
          {activeSuite === 'contracts' && <RegressionSuite />}
          {activeSuite === 'fuzzing' && <FuzzSuite />}
          {activeSuite === 'security' && <SecuritySuite />}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  suiteContent: {
    flex: 1,
  },
});
