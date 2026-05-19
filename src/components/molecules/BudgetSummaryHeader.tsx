import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface BudgetSummaryHeaderProps {
  totalBalance: number;
  budgetBase: number;
  monthlyExpenses: number;
  totalAllocated: number;
  totalSpent: number;
  mode: 'envelope' | '50-30-20';
}

export const BudgetSummaryHeader: React.FC<BudgetSummaryHeaderProps> = ({
  totalBalance,
  budgetBase,
  monthlyExpenses,
  totalAllocated,
  totalSpent,
  mode,
}) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const is503020 = mode === '50-30-20';

  // 50/30/20: postotak potrošnje od dostupnog budžeta
  // Envelope: postotak raspoređenog od dostupnog budžeta
  const percent = is503020
    ? (budgetBase > 0 ? Math.round((monthlyExpenses / budgetBase) * 100) : 0)
    : (budgetBase > 0 ? Math.round((totalAllocated / budgetBase) * 100) : 0);

  const badgeLabel = is503020 ? t('budget.spent') : t('budget.allocated');
  const spentFull = is503020 && budgetBase > 0 && monthlyExpenses >= budgetBase;
  const allocatedFull = !is503020 && totalAllocated >= budgetBase;
  const badgeDone = is503020 ? spentFull : allocatedFull;

  // Progress bar proporcije
  const progressPercent = is503020
    ? (budgetBase > 0 ? Math.min((monthlyExpenses / budgetBase) * 100, 100) : 0)
    : (budgetBase > 0 ? Math.min((totalAllocated / budgetBase) * 100, 100) : 0);

  const spentBarPercent = is503020
    ? 0 // u 50/30/20 modu, glavni bar JE potrošnja
    : (budgetBase > 0 ? Math.min((totalSpent / budgetBase) * 100, 100) : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Glavni prikaz */}
      <View style={styles.mainRow}>
        <View style={styles.mainInfo}>
          <Text style={styles.mainLabel}>{t('budget.totalBalance')}</Text>
          <Text style={styles.mainAmount}>
            {formatAmount(totalBalance)}
          </Text>
        </View>
        <View style={[styles.percentBadge, {
          backgroundColor: badgeDone ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
        }]}>
          {badgeDone ? (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          ) : (
            <Text style={styles.percentText}>
              {`${percent}%`}
            </Text>
          )}
          <Text style={styles.percentLabel}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressAllocated,
            { width: `${progressPercent}%` },
          ]}
        />
        {spentBarPercent > 0 && (
          <View
            style={[
              styles.progressSpent,
              { width: `${spentBarPercent}%` },
            ]}
          />
        )}
      </View>

      {/* Detalji — ovise o modu */}
      <View style={styles.detailRow}>
        {is503020 ? (
          <>
            <View style={styles.detail}>
              <View style={[styles.detailDot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
              <Text style={styles.detailLabel}>{t('budget.available')}</Text>
              <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(budgetBase)}</Text>
            </View>
            <View style={styles.detail}>
              <View style={[styles.detailDot, { backgroundColor: '#FFD700' }]} />
              <Text style={styles.detailLabel}>{t('budget.spent')}</Text>
              <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(monthlyExpenses)}</Text>
            </View>
            <View style={styles.detail}>
              <View style={[styles.detailDot, { backgroundColor: totalBalance > 0 ? '#4CAF50' : '#FF9800' }]} />
              <Text style={styles.detailLabel}>{t('budget.remaining')}</Text>
              <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(totalBalance)}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.detail}>
              <View style={[styles.detailDot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
              <Text style={styles.detailLabel}>{t('budget.allocated')}</Text>
              <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(totalAllocated)}</Text>
            </View>
            <View style={styles.detail}>
              <View style={[styles.detailDot, { backgroundColor: '#FFD700' }]} />
              <Text style={styles.detailLabel}>{t('budget.spent')}</Text>
              <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(totalSpent)}</Text>
            </View>
            <View style={styles.detail}>
              <View style={[styles.detailDot, { backgroundColor: (budgetBase - totalAllocated) > 0 ? '#FF9800' : 'rgba(255,255,255,0.3)' }]} />
              <Text style={styles.detailLabel}>{t('budget.free')}</Text>
              <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(Math.max(0, budgetBase - totalAllocated))}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  mainInfo: {},
  mainLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  mainAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  percentBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  percentText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  percentLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    marginBottom: Spacing.base,
    overflow: 'hidden',
  },
  progressAllocated: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detail: {
    flex: 1,
    alignItems: 'center',
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 3,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginBottom: 2,
  },
  detailAmount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
