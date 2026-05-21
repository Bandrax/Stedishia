import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';
import type { MonthlySnapshot } from '../../types';

interface LastMonthCardProps {
  snapshot: MonthlySnapshot;
  previousSnapshot?: MonthlySnapshot | null;
  monthLabel: string; // npr. "05.2026"
}

export const LastMonthCard: React.FC<LastMonthCardProps> = ({
  snapshot,
  previousSnapshot,
  monthLabel,
}) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const netPositive = snapshot.netResult >= 0;

  // Usporedba s pretprošlim mjesecom
  const expenseChange = previousSnapshot && previousSnapshot.totalExpenses > 0
    ? ((snapshot.totalExpenses - previousSnapshot.totalExpenses) / previousSnapshot.totalExpenses) * 100
    : null;

  const incomeChange = previousSnapshot && previousSnapshot.totalIncome > 0
    ? ((snapshot.totalIncome - previousSnapshot.totalIncome) / previousSnapshot.totalIncome) * 100
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t('dashboard.lastMonth', { month: monthLabel })}
          </Text>
        </View>
      </View>

      {/* Glavni brojevi */}
      <View style={styles.mainRow}>
        <View style={styles.mainStat}>
          <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>
            {t('dashboard.lastMonthIncome')}
          </Text>
          <Text style={[styles.mainValue, { color: colors.success }]}>
            {formatAmount(snapshot.totalIncome)}
          </Text>
          {incomeChange !== null && (
            <View style={styles.changeRow}>
              <Ionicons
                name={incomeChange >= 0 ? 'arrow-up' : 'arrow-down'}
                size={11}
                color={incomeChange >= 0 ? colors.success : colors.error}
              />
              <Text style={[styles.changeText, { color: incomeChange >= 0 ? colors.success : colors.error }]}>
                {Math.abs(incomeChange).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.mainStat}>
          <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>
            {t('dashboard.lastMonthExpenses')}
          </Text>
          <Text style={[styles.mainValue, { color: colors.error }]}>
            {formatAmount(snapshot.totalExpenses)}
          </Text>
          {expenseChange !== null && (
            <View style={styles.changeRow}>
              <Ionicons
                name={expenseChange <= 0 ? 'arrow-down' : 'arrow-up'}
                size={11}
                color={expenseChange <= 0 ? colors.success : colors.error}
              />
              <Text style={[styles.changeText, { color: expenseChange <= 0 ? colors.success : colors.error }]}>
                {Math.abs(expenseChange).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Neto rezultat */}
      <View style={[styles.netRow, { backgroundColor: (netPositive ? colors.success : colors.error) + '10' }]}>
        <Ionicons
          name={netPositive ? 'trending-up' : 'trending-down'}
          size={18}
          color={netPositive ? colors.success : colors.error}
        />
        <Text style={[styles.netLabel, { color: colors.textSecondary }]}>
          {t('dashboard.lastMonthNet')}
        </Text>
        <Text style={[styles.netValue, { color: netPositive ? colors.success : colors.error }]}>
          {netPositive ? '+' : ''}{formatAmount(snapshot.netResult)}
        </Text>
      </View>

      {/* Budget performance */}
      {snapshot.budgetPerformance.totalAllocated > 0 && (
        <View style={styles.budgetRow}>
          <Ionicons name="wallet-outline" size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
          <Text style={[styles.budgetText, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('dashboard.lastMonthBudget', {
              spent: formatAmount(snapshot.budgetPerformance.totalSpent),
              allocated: formatAmount(snapshot.budgetPerformance.totalAllocated),
            })}
            {snapshot.budgetPerformance.overBudgetCount > 0 &&
              ` (${t('dashboard.lastMonthOverBudget', { count: snapshot.budgetPerformance.overBudgetCount })})`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
  },
  header: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...Typography.subtitle,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  mainStat: {
    flex: 1,
  },
  mainLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  mainValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  netLabel: {
    fontSize: 13,
    flex: 1,
  },
  netValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  budgetText: {
    fontSize: 12,
    flex: 1,
  },
});
