import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';
import { formatAmount } from '../../utils';
import { getCategoryInfo } from '../../services/dashboardService';
import type { Transaction } from '../../types';

interface TransactionListItemProps {
  transaction: Transaction;
  onPress: (tx: Transaction) => void;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const catInfo = getCategoryInfo(transaction.categoryId);
  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(transaction)}
      activeOpacity={0.6}
    >
      <View style={[styles.icon, { backgroundColor: (catInfo?.color || '#607D8B') + '18' }]}>
        <Text style={styles.emoji}>{catInfo?.emoji || '📌'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.category, { color: colors.textTertiary }]}>
            {catInfo?.name || transaction.categoryId}
          </Text>
          {transaction.tags.length > 0 && (
            <Text style={[styles.tags, { color: colors.textTertiary }]}>
              #{transaction.tags[0]}
            </Text>
          )}
        </View>
      </View>
      <Text
        style={[
          styles.amount,
          { color: isIncome ? colors.success : colors.text },
        ]}
      >
        {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  description: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    fontSize: 12,
  },
  tags: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  amount: {
    ...Typography.subtitle,
  },
});
