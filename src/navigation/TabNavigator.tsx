import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  DashboardScreen,
  TransactionsScreen,
  BudgetScreen,
  GoalsScreen,
  MoreScreen,
} from '../screens';
import { useAppTheme } from '../hooks';
import { Spacing, BorderRadius, Typography } from '../constants';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabConfig = {
  Dashboard: { emoji: '🏠', label: 'Početna' },
  Transactions: { emoji: '📝', label: 'Transakcije' },
  Budget: { emoji: '💰', label: 'Budžet' },
  Goals: { emoji: '🎯', label: 'Ciljevi' },
  More: { emoji: '⚙️', label: 'Više' },
} as const;

export const TabNavigator: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => {
          const config = tabConfig[route.name];
          return (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colors.primary + '15' },
            ]}>
              <Text style={styles.emoji}>{config.emoji}</Text>
            </View>
          );
        },
        tabBarLabel: ({ focused }) => {
          const config = tabConfig[route.name];
          return (
            <Text style={[
              styles.tabLabel,
              { color: focused ? colors.primary : colors.textTertiary },
            ]}>
              {config.label}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 28,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
