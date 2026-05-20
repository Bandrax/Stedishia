import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface BudgetSummaryHeaderProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  netResult: number;
  totalBalance: number;
  totalAllocated: number;
  totalSpent: number;
  mode: 'envelope' | '50-30-20';
}

export const BudgetSummaryHeader: React.FC<BudgetSummaryHeaderProps> = ({
  monthlyIncome,
  monthlyExpenses,
  netResult,
  totalBalance,
}) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.metricsGrid}>
        {/* Monthly Income */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="arrow-down-circle" size={16} color="#4CAF50" />
            <Text style={styles.metricLabel}>{t('budget.monthlyIncome')}</Text>
          </View>
          <Text style={[styles.metricAmount, { color: '#4CAF50' }]}>
            {formatAmount(monthlyIncome)}
          </Text>
        </View>

        {/* Monthly Expenses */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="arrow-up-circle" size={16} color="#FF6B6B" />
            <Text style={styles.metricLabel}>{t('budget.monthlyExpenses')}</Text>
          </View>
          <Text style={[styles.metricAmount, { color: '#FF6B6B' }]}>
            {formatAmount(monthlyExpenses)}
          </Text>
        </View>

        {/* Net Result */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons
              name={netResult >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={netResult >= 0 ? '#4CAF50' : '#FF6B6B'}
            />
            <Text style={styles.metricLabel}>{t('budget.netResult')}</Text>
          </View>
          <Text style={[styles.metricAmount, {
            color: netResult >= 0 ? '#4CAF50' : '#FF6B6B',
          }]}>
            {netResult >= 0 ? '+' : ''}{formatAmount(netResult)}
          </Text>
        </View>

        {/* Total Balance */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="wallet" size={16} color="#FFD700" />
            <Text style={styles.metricLabel}>{t('budget.totalBalance')}</Text>
          </View>
          <Text style={[styles.metricAmount, { color: '#FFD700' }]}>
            {formatAmount(totalBalance)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricBox: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  metricAmount: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
