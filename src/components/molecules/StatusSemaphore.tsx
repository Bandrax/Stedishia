import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

export type BudgetStatus = 'good' | 'warning' | 'over';

interface BudgetDetail {
  categoryName: string;
  emoji: string;
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

const statusConfig = {
  good: {
    icon: 'checkmark-circle' as const,
    defaultMessage: 'Odlično! Na pravom ste putu.',
  },
  warning: {
    icon: 'alert-circle' as const,
    defaultMessage: 'Pažnja — približavate se limitu u nekim kategorijama.',
  },
  over: {
    icon: 'close-circle' as const,
    defaultMessage: 'Prekoračili ste budžet u nekim kategorijama.',
  },
};

export const StatusSemaphore: React.FC<StatusSemaphoreProps> = ({
  status,
  message,
  overBudgetItems = [],
  nearLimitItems = [],
  totalSpent = 0,
  totalAllocated = 0,
}) => {
  const { colors } = useAppTheme();
  const config = statusConfig[status];
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
        <Ionicons name={config.icon} size={28} color={iconColorMap[status]} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: iconColorMap[status] }]}>
            Kako mi ide ovaj mjesec?
          </Text>
          <Text style={[styles.message, { color: colors.text }]}>
            {message || config.defaultMessage}
          </Text>
          <Text style={[styles.tapHint, { color: iconColorMap[status] }]}>
            Dodirnite za detalje →
          </Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Ionicons name={config.icon} size={32} color={iconColorMap[status]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Financijski pregled
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
                    Ukupna potrošnja / budžet
                  </Text>
                  <Text style={[styles.summaryAmount, { color: iconColorMap[status] }]}>
                    {formatAmount(totalSpent)} / {formatAmount(totalAllocated)}
                  </Text>
                  <Text style={[styles.summaryPercent, { color: colors.text }]}>
                    Iskorišteno {totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0}% budžeta
                  </Text>
                </View>
              )}

              {/* Prekoračene kategorije */}
              {overBudgetItems.length > 0 && (
                <View style={styles.detailSection}>
                  <View style={styles.detailTitleRow}>
                    <Ionicons name="warning" size={16} color={colors.error} />
                    <Text style={[styles.detailTitle, { color: colors.error }]}>
                      Prekoračene kategorije
                    </Text>
                  </View>
                  {overBudgetItems.map((item, i) => {
                    const overBy = item.spent - item.allocated;
                    return (
                      <View key={i} style={[styles.detailRow, { borderColor: colors.border }]}>
                        <Text style={styles.detailEmoji}>{item.emoji}</Text>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailName, { color: colors.text }]}>{item.categoryName}</Text>
                          <Text style={[styles.detailSub, { color: colors.textSecondary }]}>
                            Potrošeno {formatAmount(item.spent)} od {formatAmount(item.allocated)}
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
                      Blizu limita (80%+)
                    </Text>
                  </View>
                  {nearLimitItems.map((item, i) => {
                    const pct = Math.round((item.spent / item.allocated) * 100);
                    return (
                      <View key={i} style={[styles.detailRow, { borderColor: colors.border }]}>
                        <Text style={styles.detailEmoji}>{item.emoji}</Text>
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
                    Kako funkcioniraju limiti?
                  </Text>
                </View>
                <Text style={[styles.tipText, { color: colors.text }]}>
                  Budžet koristi pravilo <Text style={{ fontWeight: '700' }}>50/30/20</Text> prema
                  preporuci financijskih stručnjaka (Elizabeth Warren):
                </Text>
                <Text style={[styles.tipBullet, { color: colors.text }]}>
                  • <Text style={{ fontWeight: '600' }}>50% prihoda</Text> — potrebe (stanovanje 27%, hrana 13%, prijevoz 5%, režije 3%, zdravlje 2%)
                </Text>
                <Text style={[styles.tipBullet, { color: colors.text }]}>
                  • <Text style={{ fontWeight: '600' }}>30% prihoda</Text> — želje (zabava 10%, odjeća 5%, osobno 5%, edukacija 5%, pokloni 5%)
                </Text>
                <Text style={[styles.tipBullet, { color: colors.text }]}>
                  • <Text style={{ fontWeight: '600' }}>20% prihoda</Text> — štednja i otplate (po 10%)
                </Text>
                <Text style={[styles.tipNote, { color: colors.textSecondary }]}>
                  Ove granice možete prilagoditi u tabu Budžet → Envelope mod.
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
  detailEmoji: { fontSize: 20, marginRight: Spacing.sm, width: 28, textAlign: 'center' },
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
