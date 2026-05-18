import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

export type BudgetStatus = 'good' | 'warning' | 'over';

interface StatusSemaphoreProps {
  status: BudgetStatus;
  message?: string;
}

const statusConfig = {
  good: {
    icon: 'checkmark-circle' as const,
    defaultMessage: 'Odlično! Na pravom ste putu.',
  },
  warning: {
    icon: 'alert-circle' as const,
    defaultMessage: 'Pažnja — približavate se limitu u nekim kategorijama.',
  },
  over: {
    icon: 'close-circle' as const,
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

  const iconColorMap: Record<BudgetStatus, string> = {
    good: colors.success,
    warning: colors.warning,
    over: colors.error,
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColorMap[status] }]}>
      <Ionicons name={config.icon} size={28} color={iconColorMap[status]} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: iconColorMap[status] }]}>
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
    gap: Spacing.md,
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
