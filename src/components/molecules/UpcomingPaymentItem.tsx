import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';
import { formatAmount } from '../../utils';
import { CategoryIcon } from '../atoms';

interface UpcomingPaymentItemProps {
  categoryId: string;
  description: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
}

export const UpcomingPaymentItem: React.FC<UpcomingPaymentItemProps> = ({
  categoryId,
  description,
  amount,
  dueDate,
  daysUntil,
}) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const isUrgent = daysUntil <= 2;

  return (
    <View style={styles.container}>
      <View style={styles.emoji}>
        <CategoryIcon categoryId={categoryId} size={24} color="#607D8B" />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {description}
        </Text>
        <Text style={[styles.date, { color: isUrgent ? colors.warning : colors.textTertiary }]}>
          {daysUntil === 0
            ? t('common.today')
            : daysUntil === 1
              ? t('common.tomorrow')
              : t('common.inDays', { days: daysUntil })}
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
