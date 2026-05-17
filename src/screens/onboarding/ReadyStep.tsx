import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';

interface ReadyStepProps {
  userName: string;
  accountCount: number;
  goalCount: number;
}

export const ReadyStep: React.FC<ReadyStepProps> = ({
  userName,
  accountCount,
  goalCount,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Sve je spremno!
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Počnite pratiti svoje financije i preuzmite kontrolu nad budžetom
      </Text>

      <View style={styles.summary}>
        <View style={[styles.summaryItem, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={styles.summaryEmoji}>👤</Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {userName || 'Vaš profil'}
          </Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={styles.summaryEmoji}>🏦</Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {accountCount} {accountCount === 1 ? 'račun' : accountCount < 5 ? 'računa' : 'računa'}
          </Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={styles.summaryEmoji}>🎯</Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {goalCount} {goalCount === 1 ? 'cilj' : goalCount < 5 ? 'cilja' : 'ciljeva'}
          </Text>
        </View>
      </View>

      <View style={[styles.tip, { backgroundColor: colors.primary + '10' }]}>
        <Text style={[styles.tipText, { color: colors.primary }]}>
          🚀 Savjet: Počnite s unosom transakcija odmah! Što prije
          krenete, točniji će biti vaši izvještaji i savjeti.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading1,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  summary: {
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: 12,
  },
  summaryEmoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  summaryText: {
    ...Typography.subtitle,
  },
  tip: {
    padding: Spacing.base,
    borderRadius: 12,
    width: '100%',
  },
  tipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    lineHeight: 20,
  },
});
