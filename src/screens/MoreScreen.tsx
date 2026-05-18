import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks';
import { Typography, Spacing, BorderRadius } from '../constants';
import type { RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  screen?: keyof RootStackParamList;
  iconColor?: string;
}

const menuItems: MenuItem[] = [
  { icon: 'card-outline', label: 'Računi', sublabel: 'Upravljajte računima i karticama', screen: 'Accounts', iconColor: '#2196F3' },
  { icon: 'bar-chart-outline', label: 'Izvještaji', sublabel: 'Mjesečni i godišnji pregledi', screen: 'Reports', iconColor: '#9C27B0' },
  { icon: 'bulb-outline', label: 'Financijski savjetnik', sublabel: 'Personalizirani savjeti', screen: 'Advisor', iconColor: '#FF9800' },
  { icon: 'people-outline', label: 'Kućanstvo', sublabel: 'Zajednički budžet i sync', screen: 'Household', iconColor: '#4CAF50' },
  { icon: 'repeat-outline', label: 'Ponavljajuća plaćanja', sublabel: 'Pretplate i režije', screen: 'RecurringPayments', iconColor: '#00BCD4' },
  { icon: 'settings-outline', label: 'Postavke', sublabel: 'Tema, jezik, sigurnost', screen: 'Settings', iconColor: '#607D8B' },
];

export const MoreScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Više
      </Text>

      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.menuItem,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => item.screen && navigation.navigate(item.screen as any)}
        >
          <View style={[styles.iconCircle, { backgroundColor: (item.iconColor || colors.primary) + '15' }]}>
            <Ionicons name={item.icon} size={22} color={item.iconColor || colors.primary} />
          </View>
          <View style={styles.menuText}>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              {item.label}
            </Text>
            {item.sublabel && (
              <Text style={[styles.menuSublabel, { color: colors.textSecondary }]}>
                {item.sublabel}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingTop: Spacing['2xl'],
  },
  title: {
    ...Typography.heading1,
    marginBottom: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    ...Typography.subtitle,
  },
  menuSublabel: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});
