import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAppTheme } from '../hooks';
import { Typography, Spacing, BorderRadius } from '../constants';

interface MenuItem {
  emoji: string;
  label: string;
  sublabel?: string;
}

const menuItems: MenuItem[] = [
  { emoji: '🏦', label: 'Računi', sublabel: 'Upravljajte računima i karticama' },
  { emoji: '📊', label: 'Izvještaji', sublabel: 'Mjesečni i godišnji pregledi' },
  { emoji: '🤖', label: 'Financijski savjetnik', sublabel: 'Personalizirani savjeti' },
  { emoji: '🏠', label: 'Kućanstvo', sublabel: 'Zajednički budžet i sync' },
  { emoji: '🔄', label: 'Ponavljajuća plaćanja', sublabel: 'Pretplate i režije' },
  { emoji: '⚙️', label: 'Postavke', sublabel: 'Tema, jezik, sigurnost' },
];

export const MoreScreen: React.FC = () => {
  const { colors } = useAppTheme();

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
