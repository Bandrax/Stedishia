import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface NetWorthCardProps {
  assets: number;
  liabilities: number;
  netWorth: number;
  onInfoPress?: () => void;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({
  assets,
  liabilities,
  netWorth,
  onInfoPress,
}) => {
  const { colors } = useAppTheme();
  const isPositive = netWorth >= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="trending-up" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>Neto vrijednost</Text>
        </View>
        {onInfoPress && (
          <TouchableOpacity onPress={onInfoPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.netWorth, { color: isPositive ? colors.success : colors.error }]}>
        {formatAmount(netWorth)}
      </Text>

      <View style={styles.detailRow}>
        <View style={styles.detail}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Imovina</Text>
          <Text style={[styles.detailAmount, { color: colors.text }]} numberOfLines={1}>
            {formatAmount(assets)}
          </Text>
        </View>
        <View style={styles.detail}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dugovi</Text>
          <Text style={[styles.detailAmount, { color: colors.text }]} numberOfLines={1}>
            {formatAmount(liabilities)}
          </Text>
        </View>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...Typography.subtitle,
  },
  netWorth: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  detailLabel: {
    fontSize: 13,
    marginRight: 6,
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
