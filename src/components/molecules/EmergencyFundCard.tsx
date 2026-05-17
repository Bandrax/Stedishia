import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface EmergencyFundCardProps {
  monthsCovered: number;
  totalSaved: number;
  monthlyExpenses: number;
  onInfoPress?: () => void;
}

export const EmergencyFundCard: React.FC<EmergencyFundCardProps> = ({
  monthsCovered,
  totalSaved,
  monthlyExpenses,
  onInfoPress,
}) => {
  const { colors } = useAppTheme();

  // Cilj je 3-6 mjeseci
  const targetMonths = 6;
  const percentage = Math.min((monthsCovered / targetMonths) * 100, 100);
  const status = monthsCovered >= 6 ? 'excellent' : monthsCovered >= 3 ? 'good' : monthsCovered >= 1 ? 'building' : 'start';

  const statusConfig = {
    excellent: { emoji: '🛡️', color: colors.success, label: 'Odlično zaštićeni!' },
    good: { emoji: '🟢', color: colors.success, label: 'Dobro stojite!' },
    building: { emoji: '🟡', color: colors.warning, label: 'U izgradnji...' },
    start: { emoji: '🔴', color: colors.error, label: 'Vrijeme za početak' },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🛡️ Sigurnosni fond</Text>
        {onInfoPress && (
          <TouchableOpacity onPress={onInfoPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.infoButton, { color: colors.primary }]}>ℹ️</Text>
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
        <Text style={styles.statusEmoji}>{config.emoji}</Text>
        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
      </View>

      <Text style={[styles.coverage, { color: colors.text }]}>
        Pokriva {monthsCovered.toFixed(1)} mjeseci troškova
      </Text>
      <Text style={[styles.detail, { color: colors.textSecondary }]}>
        Ušteđeno: {formatAmount(totalSaved)} • Mj. troškovi: {formatAmount(monthlyExpenses)}
      </Text>

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          💡 Preporučuje se imati ušteđevinu koja pokriva 3-6 mjeseci troškova.
          To je vaš financijski jastuk za neočekivane situacije.
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
  title: {
    ...Typography.subtitle,
  },
  infoButton: {
    fontSize: 16,
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
  },
  statusEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  coverage: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  detail: {
    fontSize: 12,
    marginBottom: Spacing.md,
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
