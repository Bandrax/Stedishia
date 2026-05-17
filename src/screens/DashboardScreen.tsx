import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppTheme } from '../hooks';
import { Typography, Spacing } from '../constants';

export const DashboardScreen: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Početna
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
          Ukupno stanje
        </Text>
        <Text style={[styles.amount, { color: colors.primary }]}>
          0,00 €
        </Text>
      </View>
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
  card: {
    padding: Spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  cardTitle: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  amount: {
    ...Typography.amount,
  },
});
