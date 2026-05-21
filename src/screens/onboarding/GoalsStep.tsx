import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SelectableChip } from '../../components/atoms';
import { useAppTheme } from '../../hooks';
import { useSettingsStore } from '../../store';
import { Typography, Spacing, BorderRadius, getGoalIonicon } from '../../constants';

interface GoalOption {
  id: string;
  emoji: string;
  labelKey: string;
}

const goalOptions: GoalOption[] = [
  { id: 'saving', emoji: '🐷', labelKey: 'onboarding.goals.saving' },
  { id: 'debtFree', emoji: '🔓', labelKey: 'onboarding.goals.debtFree' },
  { id: 'apartment', emoji: '🏠', labelKey: 'onboarding.goals.apartment' },
  { id: 'vacation', emoji: '✈️', labelKey: 'onboarding.goals.vacation' },
  { id: 'emergencyFund', emoji: '🛡️', labelKey: 'onboarding.goals.emergencyFund' },
  { id: 'car', emoji: '🚗', labelKey: 'onboarding.goals.car' },
  { id: 'education', emoji: '📚', labelKey: 'onboarding.goals.education' },
  { id: 'retirement', emoji: '🏖️', labelKey: 'onboarding.goals.retirement' },
];

interface GoalsStepProps {
  selectedGoals: string[];
  onToggleGoal: (goalId: string) => void;
}

export const GoalsStep: React.FC<GoalsStepProps> = ({
  selectedGoals,
  onToggleGoal,
}) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const iconStyle = useSettingsStore((s) => s.iconStyle);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {iconStyle === 'modern' ? (
        <View style={styles.emojiContainer}>
          <Ionicons name="flag-outline" size={48} color={colors.primary} />
        </View>
      ) : (
        <Text style={styles.emoji}>🎯</Text>
      )}
      <Text style={[styles.title, { color: colors.text }]}>
        {t('onboarding.step3Title')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('onboarding.step3Subtitle')}
      </Text>

      <View style={styles.chips}>
        {goalOptions.map((goal) => (
          <SelectableChip
            key={goal.id}
            label={t(goal.labelKey)}
            emoji={goal.emoji}
            selected={selectedGoals.includes(goal.id)}
            onPress={() => onToggleGoal(goal.id)}
          />
        ))}
      </View>

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          {t('onboarding.goalsHint')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emojiContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.heading2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  hint: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  hintText: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
});
