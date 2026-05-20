import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';

export const WelcomeStep: React.FC = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Ionicons name="wallet" size={72} color={colors.primary} style={{ marginBottom: Spacing.lg }} />
      <Text style={[styles.title, { color: colors.text }]}>
        {t('onboarding.welcome')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('onboarding.welcomeSubtitle')}
      </Text>

      <View style={[styles.philosophyCard, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="bulb-outline" size={24} color={colors.primary} style={{ marginBottom: Spacing.sm }} />
        <Text style={[styles.philosophyText, { color: colors.text }]}>
          {t('onboarding.philosophy')}
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
  philosophyCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    width: '100%',
  },
  philosophyEmoji: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  philosophyText: {
    ...Typography.body,
    lineHeight: 24,
  },
  philosophyHighlight: {
    ...Typography.body,
    fontWeight: '600',
  },
});
