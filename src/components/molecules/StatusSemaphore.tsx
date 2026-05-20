import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { CategoryIcon } from '../atoms';

export type BudgetStatus = 'good' | 'warning' | 'over';

interface BudgetDetail {
  categoryName: string;
  categoryId: string;
  spent: number;
  allocated: number;
}

interface StatusSemaphoreProps {
  status: BudgetStatus;
  message?: string;
  overBudgetItems?: BudgetDetail[];
  nearLimitItems?: BudgetDetail[];
  totalSpent?: number;
  totalAllocated?: number;
}

const statusIcons = {
  good: 'checkmark-circle' as const,
  warning: 'alert-circle' as const,
  over: 'close-circle' as const,
};

export const StatusSemaphore: React.FC<StatusSemaphoreProps> = ({
  status,
  message,
  overBudgetItems = [],
  nearLimitItems = [],
  totalSpent = 0,
  totalAllocated = 0,
}) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const icon = statusIcons[status];
  const defaultMessages: Record<BudgetStatus, string> = {
    good: t('dashboard.statusGood'),
    warning: t('dashboard.statusWarning'),
    over: t('dashboard.statusOver'),
  };
  const [showDetail, setShowDetail] = useState(false);

  const bgColorMap: Record<BudgetStatus, string> = {
    good: colors.successLight,
    warning: colors.warningLight,
    over: colors.errorLight,
  };

  const iconColorMap: Record<BudgetStatus, string> = {
    good: colors.success,
    warning: colors.warning,
    over: colors.error,
  };

  const formatAmount = (n: number) => `${n.toFixed(2)} €`;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowDetail(true)}
        style={[styles.container, { backgroundColor: bgColorMap[status] }]}
      >
        <Ionicons name={icon} size={28} color={iconColorMap[status]} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: iconColorMap[status] }]}>
            {t('dashboard.howAmIDoing')}
          </Text>
          <Text style={[styles.message, { color: colors.text }]}>
            {message || defaultMessages[status]}
          </Text>
          <Text style={[styles.tapHint, { color: iconColorMap[status] }]}>
            {t('dashboard.tapForDetails')}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Ionicons name={icon} size={32} color={iconColorMap[status]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('dashboard.financialOverview')}
              </Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Ukupno */}
              {totalAllocated > 0 && (
                <View style={[styles.summaryBox, { backgroundColor: bgColorMap[status] }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    {t('dashboard.totalSpendingVsBudget')}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: iconColorMap[status] }]}>
                    {formatAmount(totalSpent)} / {formatAmount(totalAllocated)}
                  </Text>
                  <Text style={[styles.summaryPercent, { color: colors.text }]}>
                    {t('dashboard.budgetUsed', { percent: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0 })}
                  </Text>
                </View>
              )}

              {/* Prekoračene kategorije */}
              {overBudgetItems.length > 0 && (
                <View style={styles.detailSection}>
                  <View style={styles.detailTitleRow}>
                    <Ionicons name="warning" size={16} color={colors.error} />
                    <Text style={[styles.detailTitle, { color: colors.error }]}>
                      {t('dashboard.overBudgetCategories')}
                    </Text>
                  </View>
                  {overBudgetItems.map((item, i) => {
                    const overBy = item.spent - item.allocated;
                    return (
                      <View key={i} style={[styles.detailRow, { borderColor: colors.border }]}>
                        <View style={styles.detailEmoji}><CategoryIcon categoryId={item.categoryId} size={18} color="#666" /></View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailName, { color: colors.text }]}>{item.categoryName}</Text>
                          <Text style={[styles.detailSub, { color: colors.textSecondary }]}>
                            {t('dashboard.spentOf', { spent: formatAmount(item.spent), allocated: formatAmount(item.allocated) })}
                          </Text>
                        </View>
                        <Text style={[styles.detailOver, { color: colors.error }]}>
                          +{formatAmount(overBy)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Kategorije blizu limita */}
              {nearLimitItems.length > 0 && (
                <View style={styles.detailSection}>
                  <View style={styles.detailTitleRow}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                    <Text style={[styles.detailTitle, { color: colors.warning }]}>
                      {t('dashboard.nearLimitCategories')}
                    </Text>
                  </View>
                  {nearLimitItems.map((item, i) => {
                    const pct = Math.round((item.spent / item.allocated) * 100);
                    return (
                      <View key={i} style={[styles.detailRow, { borderColor: colors.border }]}>
                        <View style={styles.detailEmoji}><CategoryIcon categoryId={item.categoryId} size={18} color="#666" /></View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailName, { color: colors.text }]}>{item.categoryName}</Text>
                          <Text style={[styles.detailSub, { color: colors.textSecondary }]}>
                            {formatAmount(item.spent)} / {formatAmount(item.allocated)}
                          </Text>
                        </View>
                        <Text style={[styles.detailPct, { color: colors.warning }]}>
                          {pct}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Savjeti */}
              <View style={[styles.tipsBox, { backgroundColor: colors.primary + '10' }]}>
                <View style={styles.detailTitleRow}>
                  <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                  <Text style={[styles.detailTitle, { color: colors.primary }]}>
                    {t('dashboard.howLimitsWork')}
                  </Text>
                </View>
                <Text style={[styles.tipText, { color: colors.text }]}>
                  {t('dashboard.limitsExplanation')}
                </Text>
                <Text style={[styles.tipBullet, { color: colors.text }]}>
                  • {t('dashboard.limitsNeeds')}
                </Text>
                <Text style={[styles.tipBullet, { color: colors.text }]}>
                  • {t('dashboard.limitsWants')}
                </Text>
                <Text style={[styles.tipBullet, { color: colors.text }]}>
                  • {t('dashboard.limitsSavings')}
                </Text>
                <Text style={[styles.tipNote, { color: colors.textSecondary }]}>
                  {t('dashboard.limitsCustomize')}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    ...Typography.bodySmall,
    lineHeight: 19,
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.heading2,
    flex: 1,
  },
  modalScroll: {},

  summaryBox: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryAmount: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  summaryPercent: { fontSize: 14 },

  detailSection: { marginBottom: Spacing.lg },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  detailTitle: { fontSize: 14, fontWeight: '700' },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailEmoji: { marginRight: Spacing.sm, width: 28, alignItems: 'center' as const, justifyContent: 'center' as const },
  detailInfo: { flex: 1 },
  detailName: { fontSize: 14, fontWeight: '600' },
  detailSub: { fontSize: 12, marginTop: 2 },
  detailOver: { fontSize: 14, fontWeight: '700' },
  detailPct: { fontSize: 14, fontWeight: '700' },

  tipsBox: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  tipText: { fontSize: 13, lineHeight: 20, marginTop: Spacing.sm },
  tipBullet: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  tipNote: { fontSize: 12, fontStyle: 'italic', marginTop: Spacing.sm },
});
