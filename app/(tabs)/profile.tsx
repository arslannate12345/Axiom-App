import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '../../src/components/AnimatedBackground';
import { useAuthStore } from '../../src/stores/authStore';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to log out.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color="#6366F1" />
          </View>
          <Text style={styles.emailText}>{user?.email || 'user@example.com'}</Text>
          <Text style={styles.statusText}>Active Account</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>User ID</Text>
              <Text style={styles.cardValue} numberOfLines={1} ellipsizeMode="middle">
                {user?.id || '---'}
              </Text>
            </View>
            <View style={[styles.cardRow, styles.borderTop]}>
              <Text style={styles.cardLabel}>Subscription</Text>
              <Text style={styles.cardValue}>Pro (Beta)</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in the next update!')}
        >
          <Ionicons name="pencil" size={18} color="#E2E8F0" style={{ marginRight: 8 }} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 48,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emailText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  cardLabel: {
    fontSize: 15,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 15,
    color: '#94A3B8',
    maxWidth: '60%',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    paddingVertical: 14,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
