import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAppTheme } from '../hooks';
import { Typography, Spacing, BorderRadius } from '../constants';
import type { RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface MenuItem {
  emoji: string;
  label: string;
  sublabel?: string;
  screen?: keyof RootStackParamList;
}

const menuItems: MenuItem[] = [
  { emoji: '🏦', label: 'Računi', sublabel: 'Upravljajte računima i karticama', screen: 'Accounts' },
  { emoji: '📊', label: 'Izvještaji', sublabel: 'Mjesečni i godišnji pregledi', screen: 'Reports' },
  { emoji: '🤖', label: 'Financijski savjetnik', sublabel: 'Personalizirani savjeti', screen: 'Advisor' },
  { emoji: '🏠', label: 'Kućanstvo', sublabel: 'Zajednički budžet i sync', screen: 'Household' },
  { emoji: '🔄', label: 'Ponavljajuća plaćanja', sublabel: 'Pretplate i režije', screen: 'RecurringPayments' },
  { emoji: '⚙️', label: 'Postavke', sublabel: 'Tema, jezik, sigurnost', screen: 'Settings' },
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
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => item.screen && navigation.navigate(item.screen as any)}
        >
          <Text style={styles.menuEmoji}>{item.emoji}</Text>
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
          <Text style={{ color: colors.textTertiary, fontSize: 18 }}>›</Text>
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
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  menuEmoji: {
    fontSize: 28,
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
