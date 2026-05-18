import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface EmergencyFundCardProps {
  monthsCovered: number;
  totalSaved: number;
  monthlyExpenses: number;
  onInfoPress?: () => void;
  onAddMoney?: () => void;
}

export const EmergencyFundCard: React.FC<EmergencyFundCardProps> = ({
  monthsCovered,
  totalSaved,
  monthlyExpenses,
  onInfoPress,
  onAddMoney,
}) => {
  const { colors } = useAppTheme();

  const targetMonths = 6;
  const targetAmount = monthlyExpenses * targetMonths;
  const progressPercent = targetAmount > 0 ? Math.min((totalSaved / targetAmount) * 100, 100) : 0;
  const status = monthsCovered >= 6 ? 'excellent' : monthsCovered >= 3 ? 'good' : monthsCovered >= 1 ? 'building' : 'start';

  const statusConfig = {
    excellent: { icon: 'shield-checkmark' as const, color: colors.success, label: 'Odlično zaštićeni!' },
    good: { icon: 'shield-half' as const, color: colors.success, label: 'Dobro stojite!' },
    building: { icon: 'shield' as const, color: colors.warning, label: 'U izgradnji...' },
    start: { icon: 'shield-outline' as const, color: colors.error, label: 'Vrijeme za početak' },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>Sigurnosni fond</Text>
        </View>
        {onInfoPress && (
          <TouchableOpacity onPress={onInfoPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mjeseci vizualizacija */}
      <View style={styles.monthsRow}>
        {[1, 2, 3, 4, 5, 6].map((month) => (
          <View key={month} style={styles.monthBlock}>
            <View
              style={[
                styles.monthBar,
                {
                  backgroundColor: month <= monthsCovered
                    ? config.color
                    : colors.surfaceVariant,
                },
              ]}
            />
            <Text style={[styles.monthLabel, { color: colors.textTertiary }]}>
              {month}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.statusRow}>
        <Ionicons name={config.icon} size={18} color={config.color} />
        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
      </View>

      <Text style={[styles.coverage, { color: colors.text }]}>
        Pokriva {monthsCovered.toFixed(1)} mjeseci troškova
      </Text>

      <View style={styles.detailRow}>
        <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>
          Ušteđeno: {formatAmount(totalSaved)}
        </Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>
          Mj. troškovi: {formatAmount(monthlyExpenses)}
        </Text>
      </View>

      {/* Progress bar */}
      {targetAmount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Napredak prema cilju
            </Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: config.color,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressTarget, { color: colors.textTertiary }]}>
            {formatAmount(totalSaved)} / {formatAmount(targetAmount)}
          </Text>
        </View>
      )}

      {/* Dodaj u štednju gumb */}
      {onAddMoney && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={onAddMoney}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Dodaj u štednju</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          Preporučuje se 3-6 mjeseci troškova kao financijski jastuk za neočekivane situacije.
        </Text>
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
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...Typography.subtitle,
  },
  monthsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: 4,
  },
  monthBlock: {
    flex: 1,
    alignItems: 'center',
  },
  monthBar: {
    width: '100%',
    height: 28,
    borderRadius: 4,
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  coverage: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detail: {
    fontSize: 12,
    flex: 1,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTarget: {
    fontSize: 11,
    textAlign: 'right',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
