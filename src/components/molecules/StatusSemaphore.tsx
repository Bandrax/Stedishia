import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

export type BudgetStatus = 'good' | 'warning' | 'over';

interface StatusSemaphoreProps {
  status: BudgetStatus;
  message?: string;
}

const statusConfig = {
  good: {
    emoji: '🟢',
    defaultMessage: 'Odlično! Na pravom ste putu.',
  },
  warning: {
    emoji: '🟡',
    defaultMessage: 'Pažnja — približavate se limitu u nekim kategorijama.',
  },
  over: {
    emoji: '🔴',
    defaultMessage: 'Prekoračili ste budžet. Pogledajmo gdje možemo uštedjeti.',
  },
};

export const StatusSemaphore: React.FC<StatusSemaphoreProps> = ({
  status,
  message,
}) => {
  const { colors } = useAppTheme();
  const config = statusConfig[status];

  const bgColorMap: Record<BudgetStatus, string> = {
    good: colors.successLight,
    warning: colors.warningLight,
    over: colors.errorLight,
  };

  const textColorMap: Record<BudgetStatus, string> = {
    good: colors.success,
    warning: colors.warning,
    over: colors.error,
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColorMap[status] }]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textColorMap[status] }]}>
          Kako mi ide ovaj mjesec?
        </Text>
        <Text style={[styles.message, { color: colors.text }]}>
          {message || config.defaultMessage}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    ...Typography.bodySmall,
    lineHeight: 19,
  },
});
