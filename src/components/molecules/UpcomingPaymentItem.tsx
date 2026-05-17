import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';
import { formatAmount, formatRelativeDate } from '../../utils';

interface UpcomingPaymentItemProps {
  emoji: string;
  description: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
}

export const UpcomingPaymentItem: React.FC<UpcomingPaymentItemProps> = ({
  emoji,
  description,
  amount,
  dueDate,
  daysUntil,
}) => {
  const { colors } = useAppTheme();
  const isUrgent = daysUntil <= 2;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {description}
        </Text>
        <Text style={[styles.date, { color: isUrgent ? colors.warning : colors.textTertiary }]}>
          {daysUntil === 0
            ? 'Danas'
            : daysUntil === 1
              ? 'Sutra'
              : `Za ${daysUntil} dana`}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.error }]}>
        -{formatAmount(amount)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  emoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  description: {
    ...Typography.body,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    ...Typography.subtitle,
  },
});
