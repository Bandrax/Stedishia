import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface BudgetSummaryHeaderProps {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  availableToAllocate: number;
}

export const BudgetSummaryHeader: React.FC<BudgetSummaryHeaderProps> = ({
  totalIncome,
  totalAllocated,
  totalSpent,
  availableToAllocate,
}) => {
  const { colors } = useAppTheme();
  const allocationPercent = totalIncome > 0
    ? Math.round((totalAllocated / totalIncome) * 100)
    : 0;
  const isFullyAllocated = availableToAllocate <= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Glavni prikaz */}
      <View style={styles.mainRow}>
        <View style={styles.mainInfo}>
          <Text style={styles.mainLabel}>Ukupno stanje</Text>
          <Text style={styles.mainAmount}>
            {formatAmount(totalIncome)}
          </Text>
        </View>
        <View style={[styles.percentBadge, {
          backgroundColor: isFullyAllocated ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
        }]}>
          {isFullyAllocated ? (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          ) : (
            <Text style={styles.percentText}>
              {`${allocationPercent}%`}
            </Text>
          )}
          <Text style={styles.percentLabel}>
            {isFullyAllocated ? 'Raspoređeno' : 'raspoređeno'}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressAllocated,
            { width: `${Math.min(allocationPercent, 100)}%` },
          ]}
        />
        {totalIncome > 0 && (
          <View
            style={[
              styles.progressSpent,
              { width: `${Math.min((totalSpent / totalIncome) * 100, 100)}%` },
            ]}
          />
        )}
      </View>

      {/* Detalji */}
      <View style={styles.detailRow}>
        <View style={styles.detail}>
          <View style={[styles.detailDot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
          <Text style={styles.detailLabel}>Raspod.</Text>
          <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(totalAllocated)}</Text>
        </View>
        <View style={styles.detail}>
          <View style={[styles.detailDot, { backgroundColor: '#FFD700' }]} />
          <Text style={styles.detailLabel}>Potrošeno</Text>
          <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(totalSpent)}</Text>
        </View>
        <View style={styles.detail}>
          <View style={[styles.detailDot, { backgroundColor: availableToAllocate > 0 ? '#FF9800' : 'rgba(255,255,255,0.3)' }]} />
          <Text style={styles.detailLabel}>Slobodno</Text>
          <Text style={styles.detailAmount} numberOfLines={1}>{formatAmount(Math.max(0, availableToAllocate))}</Text>
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
