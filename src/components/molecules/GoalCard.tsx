import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius, getGoalIonicon } from '../../constants';
import { formatAmount, formatDate } from '../../utils';
import type { SavingsGoal } from '../../types';
import { calculateMonthlyNeeded } from '../../services/goalService';
import { useSettingsStore } from '../../store';

interface GoalCardProps {
  goal: SavingsGoal;
  onPress?: () => void;
  onAddMoney?: () => void;
  onEdit?: () => void;
  onMarkCompleted?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onPress,
  onAddMoney,
  onEdit,
  onMarkCompleted,
}) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const iconStyle = useSettingsStore((s) => s.iconStyle);
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
    <View
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        {iconStyle === 'modern' ? (
          <View style={[styles.emojiContainer, { backgroundColor: (goal.color || colors.primary) + '20' }]}>
            <Ionicons name={getGoalIonicon(goal.emoji)} size={24} color={goal.color || colors.primary} />
          </View>
        ) : (
          <Text style={styles.emoji}>{goal.emoji}</Text>
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{goal.name}</Text>
          <Text style={[styles.deadline, { color: colors.textTertiary }]}>
            {isCompleted ? t('goals.goalAchieved') : t('goals.dueDate', { date: formatDate(goal.targetDate) })}
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

      {/* Action buttons */}
      {!isCompleted && (
        <View style={styles.actionRow}>
          {onAddMoney && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: (goal.color || colors.primary) + '15', flex: 1 }]}
              onPress={onAddMoney}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={16} color={goal.color || colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.actionButtonText, { color: goal.color || colors.primary }]}>
                {t('goals.addMoney')}
              </Text>
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onMarkCompleted && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
              onPress={onMarkCompleted}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            </TouchableOpacity>
          )}
          {onPress && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error + '10' }]}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Completed goal info */}
      {isCompleted && (
        <View style={[styles.completedInfo, { backgroundColor: colors.success + '10' }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
          <Text style={[styles.completedText, { color: colors.success }]}>
            {t('goals.completedOn', { date: formatDate(goal.updatedAt) })}
          </Text>
        </View>
      )}
    </View>
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
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
