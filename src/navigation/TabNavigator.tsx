import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  DashboardScreen,
  TransactionsScreen,
  BudgetScreen,
  GoalsScreen,
  MoreScreen,
} from '../screens';
import { useAppTheme } from '../hooks';
import { Spacing, BorderRadius } from '../constants';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap; label: string }> = {
  Dashboard: { icon: 'home-outline', iconFocused: 'home', label: 'Početna' },
  Transactions: { icon: 'receipt-outline', iconFocused: 'receipt', label: 'Transakcije' },
  Budget: { icon: 'wallet-outline', iconFocused: 'wallet', label: 'Budžet' },
  Goals: { icon: 'flag-outline', iconFocused: 'flag', label: 'Ciljevi' },
  More: { icon: 'grid-outline', iconFocused: 'grid', label: 'Više' },
};

export const TabNavigator: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarIcon: ({ focused, color }) => {
          const config = tabConfig[route.name];
          return (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colors.primary + '12' },
            ]}>
              <Ionicons
                name={focused ? config.iconFocused : config.icon}
                size={22}
                color={color}
              />
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
    width: 48,
    height: 28,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
