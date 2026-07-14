import { Tabs, Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={tabBgStyles.gradientLine}>
        <View style={tabBgStyles.gradientInner} />
      </View>
      <View style={tabBgStyles.bg} />
    </View>
  );
}

const tabBgStyles = StyleSheet.create({
  gradientLine: {
    height: 1,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  gradientInner: {
    height: 1,
    backgroundColor: '#6366F1',
    opacity: 0.3,
  },
  bg: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
});

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0F172A',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: '#F1F5F9',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          letterSpacing: 0.3,
        },
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: '#818CF8',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="client"
        options={{
          title: 'Client',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="send" size={size - 2} color={color} />
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/profile')} style={{ marginRight: 16 }}>
              <Ionicons name="person-circle" size={28} color="#818CF8" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="environments"
        options={{
          title: 'Variables',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="benchmarks"
        options={{
          title: 'Benchmarks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

