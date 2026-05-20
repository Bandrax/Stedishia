import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks';
import { useAuthStore, useBudgetStore } from '../store';
import { Typography, Spacing, BorderRadius, DEFAULT_EXPENSE_CATEGORIES } from '../constants';
import { formatMonth, getCurrentMonth, formatAmount } from '../utils';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryInfo } from '../services/dashboardService';
import {
  getBudgetSummary,
  upsertBudgetItem,
  generate503020Budget,
  copyBudgetFromPreviousMonth,
  getUnbudgetedSpending,
  saveBudgetPreset,
  getBudgetPresets,
  loadBudgetPreset,
  deleteBudgetPreset,
} from '../services/budgetService';
import type { BudgetPreset } from '../services/budgetService';
import { getTotalBalance, getMonthlyStats } from '../services/dashboardService';
import type { BudgetSummary } from '../services/budgetService';
import { Card, Button, CategoryIcon } from '../components/atoms';
import { BudgetSummaryHeader } from '../components/molecules/BudgetSummaryHeader';
import { BudgetEnvelopeCard } from '../components/molecules/BudgetEnvelopeCard';
import { BudgetModeToggle } from '../components/molecules/BudgetModeToggle';
import { BudgetAllocationSlider } from '../components/molecules/BudgetAllocationSlider';

export const BudgetScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { currentMonth, setCurrentMonth } = useBudgetStore();

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [unbudgeted, setUnbudgeted] = useState<Array<{ categoryId: string; spent: number }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<'envelope' | '50-30-20'>(
    (currentUser?.budgetMode as any) || 'envelope'
  );
  const [showSetup, setShowSetup] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const [actualBalance, setActualBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [presets, setPresets] = useState<BudgetPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const loadBudget = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [totalBalance, stats] = await Promise.all([
        getTotalBalance(currentUser.id),
        getMonthlyStats(currentUser.id, currentMonth),
      ]);
      setActualBalance(totalBalance);
      setMonthlyExpenses(stats.expenses);

      // Provjeri ima li budžet za ovaj mjesec — ako ne, auto-kopiraj iz prethodnog
      let budgetSummary = await getBudgetSummary(currentUser.id, 0, currentMonth);
      if (budgetSummary.items.length === 0) {
        const copied = await copyBudgetFromPreviousMonth(currentUser.id, currentMonth);
        if (copied > 0) {
          budgetSummary = await getBudgetSummary(currentUser.id, 0, currentMonth);
        }
      }

      // Efektivna baza: prihodi ako postoje, inače stanje + rashodi, inače alocirano
      const effectiveBase = stats.income > 0
        ? stats.income
        : (budgetSummary.totalAllocated > 0
          ? budgetSummary.totalAllocated
          : totalBalance + stats.expenses);
      setMonthlyIncome(effectiveBase);

      // Ponovo izračunaj s pravom bazom za availableToAllocate
      budgetSummary = await getBudgetSummary(currentUser.id, effectiveBase, currentMonth);

      const unbudgetedData = await getUnbudgetedSpending(currentUser.id, currentMonth);
      setSummary(budgetSummary);
      setUnbudgeted(unbudgetedData);
    } catch (err) {
      console.error('Error loading budget:', err);
    }
  }, [currentUser, currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadBudget();
    }, [loadBudget])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBudget();
    setRefreshing(false);
  };

  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + direction);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const handleSetup503020 = async () => {
    if (!currentUser) return;
    setIsSettingUp(true);
    try {
      // Dohvati svježe stanje i rashode
      const [totalBalance, stats] = await Promise.all([
        getTotalBalance(currentUser.id),
        getMonthlyStats(currentUser.id, currentMonth),
      ]);
      // Ako ima prihoda, koristi prihode; inače koristi stanje + rashode kao procjenu
      const base = stats.income > 0 ? stats.income : (totalBalance + stats.expenses);
      setActualBalance(totalBalance);
      setMonthlyIncome(stats.income > 0 ? stats.income : base);
      setMonthlyExpenses(stats.expenses);
      await generate503020Budget(currentUser.id, base, currentMonth);
      await loadBudget();
      setShowSetup(false);
    } catch (err) {
      Alert.alert(t('common.error'), t('budget.createError'));
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleCopyPrevious = async () => {
    if (!currentUser) return;
    setIsSettingUp(true);
    try {
      const count = await copyBudgetFromPreviousMonth(currentUser.id, currentMonth);
      if (count === 0) {
        Alert.alert(t('common.info'), t('budget.noPreviousBudget'));
      } else {
        await loadBudget();
        setShowSetup(false);
      }
    } catch (err) {
      Alert.alert(t('common.error'), t('budget.copyError'));
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleAutoBalance = async () => {
    if (!currentUser || !summary) return;
    try {
      for (const item of summary.items) {
        if (item.spent > item.allocated) {
          await upsertBudgetItem(currentUser.id, item.categoryId, currentMonth, Math.ceil(item.spent));
        }
      }
      await loadBudget();
    } catch (err) {
      console.error('Error auto-balancing:', err);
    }
  };

  const loadPresets = async () => {
    if (!currentUser) return;
    const data = await getBudgetPresets(currentUser.id);
    setPresets(data);
  };

  const handleSavePreset = async () => {
    if (!currentUser || !summary || !presetNameInput.trim()) return;
    await saveBudgetPreset(currentUser.id, presetNameInput.trim(), summary.items);
    setPresetNameInput('');
    setShowSavePreset(false);
    await loadPresets();
    Alert.alert('', t('budget.presetSaved'));
  };

  const handleLoadPreset = async (preset: BudgetPreset) => {
    if (!currentUser) return;
    await loadBudgetPreset(currentUser.id, preset, currentMonth);
    await loadBudget();
    Alert.alert('', t('budget.presetLoaded'));
  };

  const handleDeletePreset = (preset: BudgetPreset) => {
    Alert.alert(
      t('budget.deletePreset'),
      t('budget.deletePresetConfirm', { name: preset.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('budget.deletePreset'),
          style: 'destructive',
          onPress: async () => {
            await deleteBudgetPreset(preset.id);
            await loadPresets();
          },
        },
      ]
    );
  };

  const handleAllocationChange = async (categoryId: string, amount: number) => {
    if (!currentUser) return;
    try {
      await upsertBudgetItem(currentUser.id, categoryId, currentMonth, amount);
      await loadBudget();
    } catch (err) {
      console.error('Error updating allocation:', err);
    }
  };

  const hasBudget = summary && summary.items.length > 0;

  // 50/30/20 vizualizacija
  const needsCategories = ['housing', 'food', 'transport', 'utilities', 'health', 'appliances'];
  const wantsCategories = ['entertainment', 'clothing', 'personal', 'gifts', 'education', 'used_purchase'];
  const savingsCategories = ['debt', 'other_expense'];

  const groupSpent = (catIds: string[]) =>
    summary?.items
      .filter((i) => catIds.includes(i.categoryId))
      .reduce((sum, i) => sum + i.spent, 0) || 0;

  const groupAllocated = (catIds: string[]) =>
    summary?.items
      .filter((i) => catIds.includes(i.categoryId))
      .reduce((sum, i) => sum + i.allocated, 0) || 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header s mjesecom */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('budget.title')}</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <Text style={[styles.navArrow, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {formatMonth(currentMonth)}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
            <Text style={[styles.navArrow, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Ako nema budžeta — setup */}
        {!hasBudget ? (
          <View style={styles.setupContainer}>
            <Ionicons name="cash-outline" size={64} color={colors.primary} style={{ marginBottom: Spacing.base }} />
            <Text style={[styles.setupTitle, { color: colors.text }]}>
              {t('budget.setupTitle', { month: formatMonth(currentMonth) })}
            </Text>
            <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
              {t('budget.setupSubtitle')}
            </Text>

            {/* Objašnjenje metoda */}
            <Card style={styles.explainCard} variant="default" padding="base">
              <Ionicons name="mail-outline" size={28} color={colors.primary} style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.explainTitle, { color: colors.text }]}>{t('budget.envelopeTitle')}</Text>
              <Text style={[styles.explainText, { color: colors.textSecondary }]}>
                {t('budget.envelopeExplain')}
              </Text>
            </Card>

            <Card style={styles.explainCard} variant="default" padding="base">
              <Ionicons name="bar-chart-outline" size={28} color={colors.accent} style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.explainTitle, { color: colors.text }]}>{t('budget.rule503020Title')}</Text>
              <Text style={[styles.explainText, { color: colors.textSecondary }]}>
                {t('budget.rule503020Explain')}
              </Text>
            </Card>

            <View style={styles.setupButtons}>
              <Button
                title={t('budget.quickStart')}
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleSetup503020}
                loading={isSettingUp}
                icon="bar-chart-outline"
              />
              <Button
                title={t('budget.copyPrevious')}
                variant="outline"
                size="md"
                fullWidth
                onPress={handleCopyPrevious}
                icon="copy-outline"
              />
              <Button
                title={t('budget.manualSetup')}
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => setShowSetup(true)}
              />
            </View>
          </View>
        ) : (
          <>
            {/* Budget mod toggle */}
            <BudgetModeToggle mode={mode} onModeChange={setMode} />

            {/* Summary header */}
            <View style={{ marginTop: Spacing.base }}>
              <BudgetSummaryHeader
                monthlyIncome={monthlyIncome}
                monthlyExpenses={monthlyExpenses}
                netResult={monthlyIncome - monthlyExpenses}
                totalBalance={actualBalance}
                totalAllocated={summary!.totalAllocated}
                totalSpent={summary!.totalSpent}
                mode={mode}
              />
            </View>

            {/* Upozorenja */}
            {summary!.overBudgetCategories.length > 0 && (
              <Card style={{ marginTop: Spacing.base }} variant="default" padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                  <Text style={[styles.warningText, { color: colors.error, flex: 1 }]}>
                    {summary!.overBudgetCategories.length === 1
                      ? t('budget.overBudgetCount', { count: summary!.overBudgetCategories.length })
                      : t('budget.overBudgetCountPlural', { count: summary!.overBudgetCategories.length })}
                  </Text>
                </View>
              </Card>
            )}

            {summary!.nearLimitCategories.length > 0 && (
              <Card style={{ marginTop: Spacing.sm }} variant="default" padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alert-circle" size={16} color={colors.warning} />
                  <Text style={[styles.warningText, { color: colors.warning, flex: 1 }]}>
                    {summary!.nearLimitCategories.length === 1
                      ? t('budget.nearLimitCount', { count: summary!.nearLimitCategories.length })
                      : t('budget.nearLimitCountPlural', { count: summary!.nearLimitCategories.length })}
                  </Text>
                </View>
              </Card>
            )}

            {/* 50/30/20 prikaz */}
            {mode === '50-30-20' ? (
              <View style={{ marginTop: Spacing.base }}>
                {[
                  { label: t('budget.needs'), icon: 'home-outline' as const, categories: needsCategories, color: colors.primary },
                  { label: t('budget.wants'), icon: 'heart-outline' as const, categories: wantsCategories, color: colors.accent },
                  { label: t('budget.debtOther'), icon: 'card-outline' as const, categories: savingsCategories, color: colors.success },
                ].map((group) => {
                  const spent = groupSpent(group.categories);
                  const target = groupAllocated(group.categories);
                  const percent = target > 0 ? (spent / target) * 100 : 0;
                  return (
                    <Card key={group.label} style={{ marginBottom: Spacing.sm }} variant="default" padding="base">
                      <View style={styles.groupHeader}>
                        <Ionicons name={group.icon} size={20} color={group.color} style={{ marginRight: Spacing.sm }} />
                        <Text style={[styles.groupLabel, { color: colors.text }]}>{group.label}</Text>
                        <Text style={[styles.groupAmount, { color: spent > target ? colors.error : colors.textSecondary }]}>
                          {formatAmount(spent)} / {formatAmount(target)}
                        </Text>
                      </View>
                      <View style={[styles.groupTrack, { backgroundColor: colors.surfaceVariant }]}>
                        <View
                          style={[
                            styles.groupBar,
                            {
                              width: `${Math.min(percent, 100)}%`,
                              backgroundColor: spent > target ? colors.error : group.color,
                            },
                          ]}
                        />
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              /* Envelope prikaz */
              <View style={{ marginTop: Spacing.base }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    {t('budget.envelopes')}
                  </Text>
                </View>
                {summary!.items.filter((i) => i.categoryId !== 'savings').map((item) => {
                  const catInfo = getCategoryInfo(item.categoryId);
                  return (
                    <BudgetEnvelopeCard
                      key={item.id}
                      categoryName={catInfo?.name ?? item.categoryId}
                      categoryId={item.categoryId}
                      color={catInfo?.color ?? '#607D8B'}
                      allocated={item.allocated}
                      spent={item.spent}
                    />
                  );
                })}
              </View>
            )}

            {/* Potrošnja bez budžeta */}
            {unbudgeted.length > 0 && (
              <Card style={{ marginTop: Spacing.base }} variant="default" padding="base">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
                  <Ionicons name="warning-outline" size={18} color={colors.warning} />
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    {t('budget.unbudgetedTitle')}
                  </Text>
                </View>
                <Text style={[styles.unbudgetedHint, { color: colors.textSecondary }]}>
                  {t('budget.unbudgetedHint')}
                </Text>
                {unbudgeted.map((ub) => {
                  const catInfo = getCategoryInfo(ub.categoryId);
                  return (
                    <View key={ub.categoryId} style={styles.unbudgetedItem}>
                      <View style={styles.unbudgetedEmoji}>
                        <CategoryIcon categoryId={ub.categoryId} size={18} color={catInfo?.color ?? '#607D8B'} />
                      </View>
                      <Text style={[styles.unbudgetedName, { color: colors.text }]}>
                        {catInfo?.name ?? ub.categoryId}
                      </Text>
                      <Text style={[styles.unbudgetedAmount, { color: colors.warning }]}>
                        {formatAmount(ub.spent)}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Gumbi za upravljanje budžetom */}
            <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
              <Button
                title={t('budget.regenerate')}
                variant="primary"
                size="md"
                fullWidth
                icon="refresh-outline"
                onPress={() => {
                  Alert.alert(
                    t('budget.regenerateTitle'),
                    t('budget.regenerateConfirm'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('budget.regenerate'), onPress: handleSetup503020 },
                    ]
                  );
                }}
                loading={isSettingUp}
              />
              <Button
                title={t('budget.editManually')}
                variant="outline"
                size="md"
                fullWidth
                icon="create-outline"
                onPress={() => setShowSetup(true)}
              />
            </View>
          </>
        )}

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Modal za ručnu raspodjelu */}
      <Modal visible={showSetup} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
          <View style={styles.setupModalHeader}>
            <TouchableOpacity onPress={() => { setShowSetup(false); loadBudget(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={[styles.setupModalClose, { color: colors.primary }]}>{t('common.done')}</Text>
            </TouchableOpacity>
            <Text style={[styles.setupModalTitle, { color: colors.text }]}>{t('budget.allocationTitle')}</Text>
            <View style={{ width: 70 }} />
          </View>

          {/* Preostalo + auto-balance */}
          <View style={[styles.remainingBar, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.remainingText, { color: colors.text }]}>
              {t('budget.remainingToAllocate', { amount: formatAmount(summary?.availableToAllocate ?? monthlyIncome) })}
            </Text>
          </View>

          {/* Akcije */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.sm }}>
            {summary && summary.overBudgetCategories.length > 0 && (
              <TouchableOpacity
                style={[styles.actionChip, { backgroundColor: colors.primary }]}
                onPress={handleAutoBalance}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                <Text style={styles.actionChipText}>{t('budget.autoBalance')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionChip, { backgroundColor: colors.accent }]}
              onPress={() => { setShowSavePreset(true); }}
            >
              <Ionicons name="bookmark-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionChipText}>{t('budget.savePreset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionChip, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => { loadPresets(); setShowPresets(true); }}
            >
              <Ionicons name="folder-open-outline" size={16} color={colors.text} />
              <Text style={[styles.actionChipText, { color: colors.text }]}>{t('budget.loadPreset')}</Text>
            </TouchableOpacity>
          </View>

          {/* Save preset input */}
          {showSavePreset && (
            <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <TextInput
                style={[styles.presetInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder={t('budget.presetNamePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={presetNameInput}
                onChangeText={setPresetNameInput}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.actionChip, { backgroundColor: colors.primary }]}
                onPress={handleSavePreset}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionChip, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => { setShowSavePreset(false); setPresetNameInput(''); }}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {/* Preset list */}
          {showPresets && (
            <View style={{ paddingHorizontal: Spacing.base, marginBottom: Spacing.sm }}>
              {presets.length === 0 ? (
                <Text style={[styles.presetEmpty, { color: colors.textSecondary }]}>
                  {t('budget.noPresets')}
                </Text>
              ) : (
                presets.map((preset) => (
                  <View key={preset.id} style={[styles.presetRow, { borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => { handleLoadPreset(preset); setShowPresets(false); }}
                    >
                      <Text style={[styles.presetName, { color: colors.text }]}>{preset.name}</Text>
                      <Text style={[styles.presetInfo, { color: colors.textSecondary }]}>
                        {Object.keys(preset.allocations).length} kat. | {formatAmount(Object.values(preset.allocations).reduce((s, v) => s + v, 0))}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletePreset(preset)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <TouchableOpacity onPress={() => setShowPresets(false)} style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.base }}>
            {DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
              const existing = summary?.items.find((i) => i.categoryId === cat.id);
              return (
                <BudgetAllocationSlider
                  key={cat.id}
                  categoryName={cat.name}
                  categoryId={cat.id}
                  color={cat.color}
                  currentAllocation={existing?.allocated ?? 0}
                  spent={existing?.spent ?? 0}
                  onAllocationChange={(amount) => handleAllocationChange(cat.id, amount)}
                />
              );
            })}
            <View style={{ height: Spacing['3xl'] }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.heading1,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: Spacing.sm,
  },
  navArrow: {
    fontSize: 28,
    fontWeight: '300',
  },
  monthText: {
    ...Typography.body,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.md,
  },
  warningText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  // Setup (prazan budžet)
  setupContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  setupIcon: {
    marginBottom: Spacing.base,
  },
  setupTitle: {
    ...Typography.heading2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  setupSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  explainCard: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  explainIcon: {
    marginBottom: Spacing.sm,
  },
  explainTitle: {
    ...Typography.subtitle,
    marginBottom: 4,
  },
  explainText: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
  setupButtons: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  // 50/30/20 grupe
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  groupIcon: {
    marginRight: Spacing.sm,
  },
  groupLabel: {
    ...Typography.subtitle,
    flex: 1,
  },
  groupAmount: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  groupTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  groupBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Unbudgeted
  unbudgetedHint: {
    ...Typography.bodySmall,
    marginBottom: Spacing.md,
  },
  unbudgetedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  unbudgetedEmoji: {
    marginRight: Spacing.sm,
  },
  unbudgetedName: {
    ...Typography.body,
    flex: 1,
  },
  unbudgetedAmount: {
    ...Typography.body,
    fontWeight: '600',
  },
  // Action chips
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  actionChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  presetInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: 14,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  presetName: {
    ...Typography.body,
    fontWeight: '600',
  },
  presetInfo: {
    fontSize: 11,
    marginTop: 2,
  },
  presetEmpty: {
    ...Typography.bodySmall,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  // Setup modal
  setupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  setupModalClose: {
    ...Typography.body,
    fontWeight: '600',
  },
  setupModalTitle: {
    ...Typography.subtitle,
  },
  remainingBar: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  remainingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
});
