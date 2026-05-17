import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface BalanceCardProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  changePercent: number; // vs prošli mjesec
  currency?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalBalance,
  monthlyIncome,
  monthlyExpenses,
  changePercent,
  currency = 'EUR',
}) => {
  const { colors } = useAppTheme();
  const isPositiveChange = changePercent >= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Gradient overlay simulacija */}
      <View style={[styles.overlay, { backgroundColor: colors.primaryLight, opacity: 0.15 }]} />

      <Text style={styles.label}>Ukupno stanje</Text>
      <Text style={styles.amount}>{formatAmount(totalBalance, currency)}</Text>

      <View style={styles.changeRow}>
        <Text style={styles.changeIcon}>
          {isPositiveChange ? '▲' : '▼'}
        </Text>
        <Text style={styles.changeText}>
          {isPositiveChange ? '+' : ''}{changePercent.toFixed(1)}% u odnosu na prošli mjesec
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Prihodi</Text>
          <Text style={styles.statAmount}>
            +{formatAmount(monthlyIncome, currency)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Rashodi</Text>
          <Text style={styles.statAmount}>
            -{formatAmount(monthlyExpenses, currency)}
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
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  changeIcon: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginRight: 4,
  },
  changeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    marginHorizontal: Spacing.base,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
