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
  totalAllocated,
  totalSpent,
  mode,
}) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const is503020 = mode === '50-30-20';

  // Progress: expenses vs income
  const spentPercent = monthlyIncome > 0
    ? Math.min((monthlyExpenses / monthlyIncome) * 100, 100)
    : 0;

  // Allocation progress (envelope mode)
  const allocatedPercent = monthlyIncome > 0
    ? Math.min((totalAllocated / monthlyIncome) * 100, 100)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Top: 2x2 grid of key metrics */}
      <View style={styles.metricsGrid}>
        {/* Monthly Income */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="arrow-down-circle" size={16} color="#4CAF50" />
            <Text style={styles.metricLabel}>{t('budget.monthlyIncome')}</Text>
          </View>
          <Text style={styles.metricAmount}>{formatAmount(monthlyIncome)}</Text>
        </View>

        {/* Monthly Expenses */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="arrow-up-circle" size={16} color="#FF6B6B" />
            <Text style={styles.metricLabel}>{t('budget.monthlyExpenses')}</Text>
          </View>
          <Text style={styles.metricAmount}>{formatAmount(monthlyExpenses)}</Text>
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

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {is503020 ? t('budget.spent') : t('budget.allocated')}
          </Text>
          <Text style={styles.progressValue}>
            {is503020
              ? `${formatAmount(monthlyExpenses)} / ${formatAmount(monthlyIncome)}`
              : `${formatAmount(totalAllocated)} / ${formatAmount(monthlyIncome)}`
            }
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${is503020 ? spentPercent : allocatedPercent}%` },
            ]}
          />
          {!is503020 && totalSpent > 0 && (
            <View
              style={[
                styles.progressSpent,
                { width: `${Math.min((totalSpent / monthlyIncome) * 100, 100)}%` },
              ]}
            />
          )}
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
    marginBottom: Spacing.lg,
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
  progressSection: {
    marginTop: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  progressValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 3,
  },
  progressSpent: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
});
