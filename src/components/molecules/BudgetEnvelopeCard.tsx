import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface BudgetEnvelopeCardProps {
  categoryName: string;
  emoji: string;
  color: string;
  allocated: number;
  spent: number;
  onPress?: () => void;
}

export const BudgetEnvelopeCard: React.FC<BudgetEnvelopeCardProps> = ({
  categoryName,
  emoji,
  color,
  allocated,
  spent,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const remaining = allocated - spent;
  const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
  const isOver = spent > allocated;
  const isNearLimit = percentage >= 80 && !isOver;

  const fillHeight = Math.min(percentage, 100);
  const fillColor = isOver
    ? colors.error
    : isNearLimit
      ? colors.warning
      : color;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Vizualna staklenka */}
      <View style={styles.jarContainer}>
        <View style={[styles.jar, { borderColor: color + '40' }]}>
          <View
            style={[
              styles.jarFill,
              {
                height: `${fillHeight}%`,
                backgroundColor: fillColor + '30',
              },
            ]}
          />
          <Text style={styles.jarEmoji}>{emoji}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {categoryName}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: fillColor }]} />
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: fillColor,
              },
            ]}
          />
        </View>

        {/* Iznosi - stacked to prevent overflow */}
        <View style={styles.amountRow}>
          <Text style={[styles.spent, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatAmount(spent)} / {formatAmount(allocated)}
          </Text>
          <Text
            style={[
              styles.remaining,
              { color: isOver ? colors.error : colors.success },
            ]}
            numberOfLines={1}
          >
            {isOver
              ? `${formatAmount(Math.abs(remaining))} preko`
              : `${formatAmount(remaining)} ost.`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  jarContainer: {
    marginRight: Spacing.md,
  },
  jar: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jarFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  jarEmoji: {
    fontSize: 20,
    zIndex: 1,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  name: {
    ...Typography.subtitle,
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spent: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  remaining: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
});
