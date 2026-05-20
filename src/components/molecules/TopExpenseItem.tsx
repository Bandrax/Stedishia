import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';
import { formatAmount } from '../../utils';
import { CategoryIcon } from '../atoms';

interface TopExpenseItemProps {
  rank: number;
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export const TopExpenseItem: React.FC<TopExpenseItemProps> = ({
  rank,
  categoryId,
  categoryName,
  amount,
  percentage,
  color,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.rank, { backgroundColor: color + '20' }]}>
        <Text style={[styles.rankText, { color }]}>{rank}</Text>
      </View>
      <View style={styles.emoji}>
        <CategoryIcon categoryId={categoryId} size={22} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{categoryName}</Text>
        <Text style={[styles.percent, { color: colors.textTertiary }]}>
          {percentage.toFixed(0)}% rashoda
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.text }]}>
        {formatAmount(amount)}
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
  rank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emoji: {
    marginRight: Spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    ...Typography.body,
    fontWeight: '500',
  },
  percent: {
    fontSize: 12,
    marginTop: 1,
  },
  amount: {
    ...Typography.subtitle,
  },
});
