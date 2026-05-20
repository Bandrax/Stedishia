import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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

const tabIcons: Record<string, { icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { icon: 'home-outline', iconFocused: 'home' },
  Transactions: { icon: 'receipt-outline', iconFocused: 'receipt' },
  Budget: { icon: 'wallet-outline', iconFocused: 'wallet' },
  Goals: { icon: 'flag-outline', iconFocused: 'flag' },
  More: { icon: 'grid-outline', iconFocused: 'grid' },
};

const tabLabelKeys: Record<string, string> = {
  Dashboard: 'nav.home',
  Transactions: 'nav.transactions',
  Budget: 'nav.budget',
  Goals: 'nav.goals',
  More: 'nav.more',
};

export const TabNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

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
          const icons = tabIcons[route.name];
          return (
            <View style={[
              styles.iconContainer,
              focused && { backgroundColor: colors.primary + '12' },
            ]}>
              <Ionicons
                name={focused ? icons.iconFocused : icons.icon}
                size={22}
                color={color}
              />
            </View>
          );
        },
        tabBarLabel: ({ focused }) => {
          return (
            <Text style={[
              styles.tabLabel,
              { color: focused ? colors.primary : colors.textTertiary },
            ]}>
              {t(tabLabelKeys[route.name])}
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
