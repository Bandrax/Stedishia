import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { RootNavigator } from './src/navigation';
import { useThemeStore, useAuthStore, useSettingsStore } from './src/store';
import { initializeDatabase } from './src/services/database';
import {
  requestNotificationPermissions,
  scheduleAllNotifications,
} from './src/services/notificationService';
import './src/locales/i18n';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateSystemTheme, colorScheme } = useThemeStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await useSettingsStore.getState().loadSettings();
        await requestNotificationPermissions();
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Startup error');
      }
    };
    init();
  }, []);

  // Schedule notifications when user is available
  useEffect(() => {
    if (!isReady) return;
    const unsub = useAuthStore.subscribe((state) => {
      if (state.currentUser) {
        scheduleAllNotifications(state.currentUser.id).catch(console.error);
      }
    });
    // Also run immediately if user is already set
    const user = useAuthStore.getState().currentUser;
    if (user) {
      scheduleAllNotifications(user.id).catch(console.error);
    }
    return unsub;
  }, [isReady]);

  // Praćenje promjene sistemske teme
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      updateSystemTheme();
    });
    return () => subscription.remove();
  }, [updateSystemTheme]);

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={48} color="#C62828" style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <Ionicons name="wallet-outline" size={64} color="#0F4C3A" style={{ marginBottom: 16 }} />
        <Text style={styles.loadingText}>Sthedisia</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F4C3A',
  },
  errorText: {
    fontSize: 16,
    color: '#C62828',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
