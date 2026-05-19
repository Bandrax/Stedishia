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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
} from '../services/budgetService';
import { getTotalBalance } from '../services/dashboardService';
import type { BudgetSummary } from '../services/budgetService';
import { Card, Button } from '../components/atoms';
import { BudgetSummaryHeader } from '../components/molecules/BudgetSummaryHeader';
import { BudgetEnvelopeCard } from '../components/molecules/BudgetEnvelopeCard';
import { BudgetModeToggle } from '../components/molecules/BudgetModeToggle';
import { BudgetAllocationSlider } from '../components/molecules/BudgetAllocationSlider';

export const BudgetScreen: React.FC = () => {
  const { colors } = useAppTheme();
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

  const [effectiveIncome, setEffectiveIncome] = useState(currentUser?.monthlyIncome || 0);

  const loadBudget = useCallback(async () => {
    if (!currentUser) return;
    try {
      // Koristi veći iznos: ukupno stanje računa ili mjesečni prihod iz profila
      const totalBalance = await getTotalBalance(currentUser.id);
      const profileIncome = currentUser.monthlyIncome || 0;
      const income = Math.max(totalBalance, profileIncome);
      setEffectiveIncome(income);

      const [budgetSummary, unbudgetedData] = await Promise.all([
        getBudgetSummary(currentUser.id, income, currentMonth),
        getUnbudgetedSpending(currentUser.id, currentMonth),
      ]);
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
      // Uvijek dohvati svježe stanje računa
      const totalBalance = await getTotalBalance(currentUser.id);
      const profileIncome = currentUser.monthlyIncome || 0;
      const freshIncome = Math.max(totalBalance, profileIncome);
      setEffectiveIncome(freshIncome);
      await generate503020Budget(currentUser.id, freshIncome, currentMonth);
      await loadBudget();
      setShowSetup(false);
    } catch (err) {
      Alert.alert('Greška', 'Nije moguće kreirati budžet.');
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
        Alert.alert('Info', 'Nema budžeta u prošlom mjesecu za kopiranje.');
      } else {
        await loadBudget();
        setShowSetup(false);
      }
    } catch (err) {
      Alert.alert('Greška', 'Nije moguće kopirati budžet.');
    } finally {
      setIsSettingUp(false);
    }
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
  const needsCategories = ['housing', 'food', 'transport', 'utilities', 'health'];
  const wantsCategories = ['entertainment', 'clothing', 'personal', 'gifts', 'education'];
  const savingsCategories = ['savings', 'debt'];

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
        <Text style={[styles.title, { color: colors.text }]}>Budžet</Text>
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
              Postavite budžet za {formatMonth(currentMonth)}
            </Text>
            <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
              Dajte svakom euru svoju svrhu! Odaberite metodu koja vam odgovara.
            </Text>

            {/* Objašnjenje metoda */}
            <Card style={styles.explainCard} variant="default" padding="base">
              <Ionicons name="mail-outline" size={28} color={colors.primary} style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.explainTitle, { color: colors.text }]}>Metoda kuverti</Text>
              <Text style={[styles.explainText, { color: colors.textSecondary }]}>
                Zamislite da svaki euro stavljate u posebnu kuvertu. Svaka kuverta ima svoju
                namjenu — stan, hrana, zabava... Kad kuvertu potrošite, to je to za taj mjesec!
              </Text>
            </Card>

            <Card style={styles.explainCard} variant="default" padding="base">
              <Ionicons name="bar-chart-outline" size={28} color={colors.accent} style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.explainTitle, { color: colors.text }]}>50/30/20 pravilo</Text>
              <Text style={[styles.explainText, { color: colors.textSecondary }]}>
                Jednostavno pravilo: 50% za potrebe (stan, režije, hrana), 30% za želje
                (zabava, odjeća), 20% za štednju i otplatu dugova.
              </Text>
            </Card>

            <View style={styles.setupButtons}>
              <Button
                title="50/30/20 — brzi start"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleSetup503020}
                loading={isSettingUp}
                icon="bar-chart-outline"
              />
              <Button
                title="Kopiraj iz prošlog mjeseca"
                variant="outline"
                size="md"
                fullWidth
                onPress={handleCopyPrevious}
                icon="copy-outline"
              />
              <Button
                title="Ručno rasporedi"
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
                totalIncome={effectiveIncome}
                totalAllocated={summary!.totalAllocated}
                totalSpent={summary!.totalSpent}
                availableToAllocate={summary!.availableToAllocate}
              />
            </View>

            {/* Upozorenja */}
            {summary!.overBudgetCategories.length > 0 && (
              <Card style={{ marginTop: Spacing.base }} variant="default" padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                  <Text style={[styles.warningText, { color: colors.error, flex: 1 }]}>
                    Prekoračenje u {summary!.overBudgetCategories.length} {
                      summary!.overBudgetCategories.length === 1 ? 'kategoriji' : 'kategorija'
                    }
                  </Text>
                </View>
              </Card>
            )}

            {summary!.nearLimitCategories.length > 0 && (
              <Card style={{ marginTop: Spacing.sm }} variant="default" padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alert-circle" size={16} color={colors.warning} />
                  <Text style={[styles.warningText, { color: colors.warning, flex: 1 }]}>
                    Približavate se limitu u {summary!.nearLimitCategories.length} {
                      summary!.nearLimitCategories.length === 1 ? 'kategoriji' : 'kategorija'
                    }
                  </Text>
                </View>
              </Card>
            )}

            {/* 50/30/20 prikaz */}
            {mode === '50-30-20' ? (
              <View style={{ marginTop: Spacing.base }}>
                {[
                  { label: 'Potrebe (50%)', icon: 'home-outline' as const, target: effectiveIncome * 0.5, categories: needsCategories, color: colors.primary },
                  { label: 'Želje (30%)', icon: 'heart-outline' as const, target: effectiveIncome * 0.3, categories: wantsCategories, color: colors.accent },
                  { label: 'Štednja & dugovi (20%)', icon: 'save-outline' as const, target: effectiveIncome * 0.2, categories: savingsCategories, color: colors.success },
                ].map((group) => {
                  const spent = groupSpent(group.categories);
                  const percent = group.target > 0 ? (spent / group.target) * 100 : 0;
                  return (
                    <Card key={group.label} style={{ marginBottom: Spacing.sm }} variant="default" padding="base">
                      <View style={styles.groupHeader}>
                        <Ionicons name={group.icon} size={20} color={group.color} style={{ marginRight: Spacing.sm }} />
                        <Text style={[styles.groupLabel, { color: colors.text }]}>{group.label}</Text>
                        <Text style={[styles.groupAmount, { color: spent > group.target ? colors.error : colors.textSecondary }]}>
                          {formatAmount(spent)} / {formatAmount(group.target)}
                        </Text>
                      </View>
                      <View style={[styles.groupTrack, { backgroundColor: colors.surfaceVariant }]}>
                        <View
                          style={[
                            styles.groupBar,
                            {
                              width: `${Math.min(percent, 100)}%`,
                              backgroundColor: spent > group.target ? colors.error : group.color,
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
                    Kuverte
                  </Text>
                </View>
                {summary!.items.map((item) => {
                  const catInfo = getCategoryInfo(item.categoryId);
                  return (
                    <BudgetEnvelopeCard
                      key={item.id}
                      categoryName={catInfo?.name ?? item.categoryId}
                      emoji={catInfo?.emoji ?? '📌'}
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
                    Troškovi bez budžeta
                  </Text>
                </View>
                <Text style={[styles.unbudgetedHint, { color: colors.textSecondary }]}>
                  Ove kategorije imaju troškove ali nemaju postavljeni budžet.
                </Text>
                {unbudgeted.map((ub) => {
                  const catInfo = getCategoryInfo(ub.categoryId);
                  return (
                    <View key={ub.categoryId} style={styles.unbudgetedItem}>
                      <Text style={styles.unbudgetedEmoji}>{catInfo?.emoji ?? '📌'}</Text>
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
                title="Regeneriraj 50/30/20"
                variant="primary"
                size="md"
                fullWidth
                icon="refresh-outline"
                onPress={() => {
                  Alert.alert(
                    'Regeneriraj budžet',
                    'Ovo će resetirati sve kategorije na preporučene postotke prema 50/30/20 pravilu. Nastaviti?',
                    [
                      { text: 'Odustani', style: 'cancel' },
                      { text: 'Regeneriraj', onPress: handleSetup503020 },
                    ]
                  );
                }}
                loading={isSettingUp}
              />
              <Button
                title="Uredi raspodjelu ručno"
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
            <TouchableOpacity onPress={() => { setShowSetup(false); loadBudget(); }}>
              <Text style={[styles.setupModalClose, { color: colors.primary }]}>Gotovo</Text>
            </TouchableOpacity>
            <Text style={[styles.setupModalTitle, { color: colors.text }]}>Raspodjela budžeta</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Preostalo */}
          <View style={[styles.remainingBar, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.remainingText, { color: colors.text }]}>
              Preostaje za raspodjelu: {formatAmount(summary?.availableToAllocate ?? effectiveIncome)}
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.base }}>
            {DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
              const existing = summary?.items.find((i) => i.categoryId === cat.id);
              return (
                <BudgetAllocationSlider
                  key={cat.id}
                  categoryName={cat.name}
                  emoji={cat.emoji}
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
    fontSize: 18,
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
