import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={72} color={colors.success} style={{ marginBottom: Spacing.lg }} />
      <Text style={[styles.title, { color: colors.text }]}>
        {t('onboarding.step5Title')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('onboarding.step5Subtitle')}
      </Text>

      <View style={styles.summary}>
        <View style={[styles.summaryItem, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="person" size={24} color={colors.primary} style={{ marginRight: Spacing.md }} />
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {userName || t('onboarding.yourProfile')}
          </Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="business" size={24} color={colors.primary} style={{ marginRight: Spacing.md }} />
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {t('onboarding.accountCountSummary', { count: accountCount })}
          </Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="flag" size={24} color={colors.primary} style={{ marginRight: Spacing.md }} />
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {t('onboarding.goalCountSummary', { count: goalCount })}
          </Text>
        </View>
      </View>

      <View style={[styles.tip, { backgroundColor: colors.primary + '10' }]}>
        <Text style={[styles.tipText, { color: colors.primary }]}>
          {t('onboarding.readyTip')}
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
