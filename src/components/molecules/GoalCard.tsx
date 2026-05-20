import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount, formatDate } from '../../utils';
import type { SavingsGoal } from '../../types';
import { calculateMonthlyNeeded } from '../../services/goalService';

interface GoalCardProps {
  goal: SavingsGoal;
  onPress?: () => void;
  onAddMoney?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onPress,
  onAddMoney,
}) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const percentage = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0;
  const isCompleted = goal.status === 'completed';
  const monthlyNeeded = calculateMonthlyNeeded(
    goal.targetAmount,
    goal.currentAmount,
    goal.targetDate
  );

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{goal.emoji}</Text>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{goal.name}</Text>
          <Text style={[styles.deadline, { color: colors.textTertiary }]}>
            {isCompleted ? t('goals.goalAchieved') : t('goals.dueDate', { date: formatDate(goal.targetDate, 'd. MMM yyyy.') })}
          </Text>
        </View>
        {isCompleted && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, { color: goal.color || colors.primary }]}>
            {formatAmount(goal.currentAmount)}
          </Text>
          <Text style={[styles.targetAmount, { color: colors.textSecondary }]}>
            / {formatAmount(goal.targetAmount)}
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor: isCompleted ? colors.success : (goal.color || colors.primary),
              },
            ]}
          />
        </View>

        <View style={styles.statsRow}>
          <Text style={[styles.percentage, { color: colors.textSecondary }]}>
            {t('goals.percentAchieved', { percent: percentage.toFixed(0) })}
          </Text>
          {!isCompleted && monthlyNeeded > 0 && (
            <Text style={[styles.monthlyNeeded, { color: colors.primary }]}>
              {t('goals.monthlyNeededShort', { amount: formatAmount(monthlyNeeded) })}
            </Text>
          )}
        </View>
      </View>

      {/* Add money button */}
      {!isCompleted && onAddMoney && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: (goal.color || colors.primary) + '15' }]}
          onPress={onAddMoney}
          activeOpacity={0.7}
        >
          <Text style={[styles.addButtonText, { color: goal.color || colors.primary }]}>
            {t('goals.addMoney')}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    ...Typography.subtitle,
    marginBottom: 2,
  },
  deadline: {
    fontSize: 12,
  },
  completedBadge: {},
  progressSection: {
    marginBottom: Spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  currentAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  percentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  monthlyNeeded: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
