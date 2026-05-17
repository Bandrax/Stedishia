import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks';
import { Typography, Spacing } from '../constants';

export const TransactionsScreen: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Transakcije
      </Text>
      <View style={styles.emptyState}>
        <Text style={[styles.emptyEmoji]}>📝</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Još nemate transakcija.{'\n'}Dodajte prvu pritiskom na + gumb!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.base,
    paddingTop: Spacing['2xl'],
  },
  title: {
    ...Typography.heading1,
    marginBottom: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing['5xl'],
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
