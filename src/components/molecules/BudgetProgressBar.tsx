import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';
import { CategoryIcon } from '../atoms';

interface BudgetProgressBarProps {
  categoryName: string;
  categoryId: string;
  spent: number;
  allocated: number;
  color: string;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  categoryName,
  categoryId,
  spent,
  allocated,
  color,
}) => {
  const { colors } = useAppTheme();
  const percentage = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const isOver = spent > allocated;
  const overPercentage = allocated > 0 ? Math.min((spent / allocated) * 100, 150) : 0;

  const barColor = isOver ? colors.error : percentage > 80 ? colors.warning : color;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CategoryIcon categoryId={categoryId} size={16} color={color} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {categoryName}
        </Text>
        <Text
          style={[styles.amount, { color: isOver ? colors.error : colors.textSecondary }]}
          numberOfLines={1}
        >
          {formatAmount(spent)}/{formatAmount(allocated)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
        <View
          style={[
            styles.bar,
            {
              width: `${Math.min(overPercentage, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  name: {
    ...Typography.bodySmall,
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
  },
  amount: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 0,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
});
