import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PinScreen } from '../screens/auth/PinScreen';
import { useAppTheme } from '../hooks';
import { useAuthStore } from '../store';
import { dbGetAll } from '../services/database';
import type { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const { isAuthenticated, isOnboarded, setOnboarded } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Provjeri postoji li korisnik u bazi
      const users = await dbGetAll<any>('users');
      if (users.length > 0) {
        setOnboarded(true);
      }
    } catch (err) {
      console.error('Error checking onboarding:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  if (isChecking) return null;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={PinScreen} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
