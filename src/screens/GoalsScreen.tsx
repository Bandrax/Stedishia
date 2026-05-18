import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../hooks';
import { useAuthStore, useGoalStore, useAccountStore } from '../store';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatAmount } from '../utils';
import {
  getGoals,
  createGoal,
  addToGoal,
  deleteGoalById,
  getNetWorth,
  getEmergencyFundCoverage,
  calculateMonthlyNeeded,
} from '../services/goalService';
import { getAccounts } from '../services/accountService';
import { createTransaction } from '../services/transactionService';
import { getMonthlyStats } from '../services/dashboardService';
import { Button, Card } from '../components/atoms';
import { GoalCard } from '../components/molecules/GoalCard';
import { NetWorthCard } from '../components/molecules/NetWorthCard';
import { EmergencyFundCard } from '../components/molecules/EmergencyFundCard';
import type { SavingsGoal, Account } from '../types';

const GOAL_EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💻', '📚', '🎓', '🏖️', '💍', '🎉', '🎸', '🐕'];
const GOAL_COLORS = ['#0F4C3A', '#D4AF37', '#2196F3', '#FF5722', '#9C27B0', '#4CAF50', '#FF9800', '#E91E63'];

export const GoalsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { currentUser } = useAuthStore();
  const { goals, setGoals } = useGoalStore();
  const { accounts, setAccounts } = useAccountStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState<string | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyAccountId, setAddMoneyAccountId] = useState('');
  const [netWorthData, setNetWorthData] = useState({ assets: 0, liabilities: 0, netWorth: 0 });
  const [emergencyMonths, setEmergencyMonths] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [savingsTotal, setSavingsTotal] = useState(0);

  // Forma za novi cilj
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('🎯');
  const [goalColor, setGoalColor] = useState('#0F4C3A');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [goalsData, nw, stats, accs] = await Promise.all([
        getGoals(currentUser.id),
        getNetWorth(currentUser.id),
        getMonthlyStats(currentUser.id),
        getAccounts(currentUser.id),
      ]);

      setGoals(goalsData);
      setNetWorthData(nw);
      setMonthlyExpenses(stats.expenses);
      setAccounts(accs);

      const coverage = await getEmergencyFundCoverage(currentUser.id, stats.expenses);
      setEmergencyMonths(coverage);

      // Ukupno u štednim računima
      const savingsTotal = accs
        .filter((a) => a.type === 'savings')
        .reduce((sum, a) => sum + a.balance, 0);
      setSavingsTotal(savingsTotal);
    } catch (err) {
      console.error('Error loading goals:', err);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateGoal = async () => {
    if (!currentUser || !goalName || !goalAmount) return;

    const targetAmount = parseFloat(goalAmount.replace(',', '.'));
    if (isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Greška', 'Unesite ispravan ciljani iznos.');
      return;
    }

    // Default datum: 1 godina od danas
    let targetDate = goalDate;
    if (!targetDate) {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      targetDate = d.toISOString().split('T')[0];
    }

    const monthlyNeeded = calculateMonthlyNeeded(targetAmount, 0, targetDate);

    setIsSubmitting(true);
    try {
      await createGoal({
        userId: currentUser.id,
        name: goalName,
        emoji: goalEmoji,
        targetAmount,
        currentAmount: 0,
        targetDate,
        monthlyContribution: monthlyNeeded,
        status: 'active',
        color: goalColor,
      });

      setShowAddGoal(false);
      resetGoalForm();
      await loadData();
    } catch (err) {
      Alert.alert('Greška', 'Nije moguće kreirati cilj.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMoney = async () => {
    if (!showAddMoney || !currentUser) return;
    const amount = parseFloat(addMoneyAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Greška', 'Unesite ispravan iznos.');
      return;
    }
    if (!addMoneyAccountId) {
      Alert.alert('Greška', 'Odaberite račun s kojeg skidate novac.');
      return;
    }

    try {
      // Find the goal name for transaction description
      const goal = goals.find((g) => g.id === showAddMoney);
      const goalName = goal?.name || 'Cilj';

      // Create a real transaction that debits the account
      await createTransaction({
        userId: currentUser.id,
        accountId: addMoneyAccountId,
        type: 'expense',
        scope: 'personal',
        amount,
        currency: 'EUR',
        categoryId: 'savings',
        description: `Štednja: ${goalName}`,
        date: new Date().toISOString().split('T')[0],
        tags: ['štednja', 'cilj'],
        isRecurring: false,
      });

      // Update the goal progress
      const updated = await addToGoal(showAddMoney, amount);
      if (updated?.status === 'completed') {
        Alert.alert('Čestitamo!', `Ostvarili ste cilj "${updated.name}"!`);
      }
      setShowAddMoney(null);
      setAddMoneyAmount('');
      setAddMoneyAccountId('');
      await loadData();
    } catch (err) {
      Alert.alert('Greška', 'Nije moguće dodati iznos.');
    }
  };

  const handleDeleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      'Obriši cilj',
      `Jeste li sigurni da želite obrisati cilj "${goal.name}"?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            await deleteGoalById(goal.id);
            await loadData();
          },
        },
      ]
    );
  };

  const resetGoalForm = () => {
    setGoalName('');
    setGoalAmount('');
    setGoalDate('');
    setGoalEmoji('🎯');
    setGoalColor('#0F4C3A');
  };

  // Emergency fund goal - find or auto-create
  const EMERGENCY_FUND_NAME = 'Sigurnosni fond';
  const emergencyGoal = goals.find((g) => g.name === EMERGENCY_FUND_NAME && g.status === 'active');

  const ensureEmergencyGoal = useCallback(async () => {
    if (!currentUser || monthlyExpenses <= 0) return null;
    const existing = goals.find((g) => g.name === EMERGENCY_FUND_NAME && g.status === 'active');
    if (existing) return existing.id;

    const targetAmount = monthlyExpenses * 6;
    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + 2);
    const monthlyNeeded = calculateMonthlyNeeded(targetAmount, savingsTotal, targetDate.toISOString().split('T')[0]);

    const id = await createGoal({
      userId: currentUser.id,
      name: EMERGENCY_FUND_NAME,
      emoji: '🛡️',
      targetAmount,
      currentAmount: savingsTotal,
      targetDate: targetDate.toISOString().split('T')[0],
      monthlyContribution: monthlyNeeded,
      status: 'active',
      color: '#0F4C3A',
    });
    await loadData();
    return id;
  }, [currentUser, goals, monthlyExpenses, savingsTotal, loadData]);

  const handleEmergencyAddMoney = async () => {
    let goalId = emergencyGoal?.id;
    if (!goalId) {
      goalId = await ensureEmergencyGoal() ?? undefined;
    }
    if (goalId) {
      setShowAddMoney(goalId);
    }
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Ciljevi</Text>
        <TouchableOpacity onPress={() => setShowAddGoal(true)}>
          <Text style={[styles.addButton, { color: colors.primary }]}>+ Novi cilj</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Neto vrijednost */}
        <NetWorthCard
          assets={netWorthData.assets}
          liabilities={netWorthData.liabilities}
          netWorth={netWorthData.netWorth}
          onInfoPress={() => Alert.alert(
            'Neto vrijednost',
            'Neto vrijednost = sve što imate (računi, štednja) minus sve što dugujete (krediti, kartice).\n\nCilj je da ovaj broj raste iz mjeseca u mjesec.'
          )}
        />

        {/* Sigurnosni fond */}
        <View style={{ marginTop: Spacing.base }}>
          <EmergencyFundCard
            monthsCovered={emergencyMonths}
            totalSaved={savingsTotal}
            monthlyExpenses={monthlyExpenses}
            onAddMoney={handleEmergencyAddMoney}
            onInfoPress={() => Alert.alert(
              'Sigurnosni fond',
              'Sigurnosni fond je ušteđevina koja pokriva 3-6 mjeseci vaših troškova.\n\nTo je vaš financijski jastuk za neočekivane situacije poput gubitka posla, kvara auta ili zdravstvenih troškova.'
            )}
          />
        </View>

        {/* Aktivni ciljevi */}
        {activeGoals.length > 0 && (
          <View style={{ marginTop: Spacing.lg }}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flag-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Aktivni ciljevi</Text>
            </View>
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => handleDeleteGoal(goal)}
                onAddMoney={() => setShowAddMoney(goal.id)}
              />
            ))}
          </View>
        )}

        {/* Ostvareni ciljevi */}
        {completedGoals.length > 0 && (
          <View style={{ marginTop: Spacing.lg }}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trophy-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ostvareni ciljevi</Text>
            </View>
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </View>
        )}

        {/* Empty state */}
        {goals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={56} color={colors.primary} style={{ marginBottom: Spacing.base }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nemate postavljenih ciljeva
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Postavite prvi cilj i krenite štedjeti za nešto posebno!
            </Text>
            <Button
              title="Postavi prvi cilj"
              variant="primary"
              onPress={() => setShowAddGoal(true)}
              icon="flag-outline"
            />
          </View>
        )}

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Modal: Novi cilj */}
      <Modal visible={showAddGoal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddGoal(false); resetGoalForm(); }}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Odustani</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novi cilj</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Emoji picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ikona</Text>
            <View style={styles.emojiRow}>
              {GOAL_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.emojiOption,
                    goalEmoji === e && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setGoalEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Naziv */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Naziv cilja</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={goalName}
              onChangeText={setGoalName}
              placeholder="npr. Godišnji odmor u Grčkoj"
              placeholderTextColor={colors.textTertiary}
            />

            {/* Ciljani iznos */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ciljani iznos (€)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={goalAmount}
              onChangeText={(t) => setGoalAmount(t.replace(/[^0-9.,]/g, ''))}
              placeholder="5000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />

            {/* Datum */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Do kada? (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={goalDate}
              onChangeText={setGoalDate}
              placeholder="2027-06-01 (default: za godinu dana)"
              placeholderTextColor={colors.textTertiary}
            />

            {/* Kalkulator */}
            {goalAmount && (
              <Card style={{ marginTop: Spacing.md }} variant="default" padding="md">
                <Text style={[styles.calcText, { color: colors.text }]}>
                  Za ovaj cilj trebate odvajati približno{' '}
                  <Text style={{ fontWeight: '700', color: colors.primary }}>
                    {formatAmount(
                      calculateMonthlyNeeded(
                        parseFloat(goalAmount.replace(',', '.')) || 0,
                        0,
                        goalDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      )
                    )}
                  </Text>
                  {' '}mjesečno.
                </Text>
              </Card>
            )}

            {/* Boja */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>Boja</Text>
            <View style={styles.colorRow}>
              {GOAL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    goalColor === c && styles.colorSelected,
                  ]}
                  onPress={() => setGoalColor(c)}
                />
              ))}
            </View>

            <View style={{ marginTop: Spacing.xl }}>
              <Button
                title="Kreiraj cilj"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleCreateGoal}
                loading={isSubmitting}
                disabled={!goalName || !goalAmount}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal: Dodaj novac cilju */}
      <Modal visible={showAddMoney !== null} animationType="fade" transparent>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.addMoneyModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.addMoneyTitle, { color: colors.text }]}>Dodaj iznos</Text>

            {/* Odabir računa */}
            <Text style={[styles.addMoneyLabel, { color: colors.textSecondary }]}>S kojeg računa?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountPickerRow}>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.accountChip,
                    {
                      backgroundColor: addMoneyAccountId === acc.id ? colors.primary + '15' : colors.surface,
                      borderColor: addMoneyAccountId === acc.id ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAddMoneyAccountId(acc.id)}
                >
                  <Text style={[styles.accountChipText, { color: addMoneyAccountId === acc.id ? colors.primary : colors.text }]}>
                    {acc.icon} {acc.name}
                  </Text>
                  <Text style={[styles.accountChipBalance, { color: colors.textTertiary }]}>
                    {formatAmount(acc.balance)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.addMoneyInput, { color: colors.text, borderColor: colors.border }]}
              value={addMoneyAmount}
              onChangeText={(t) => setAddMoneyAmount(t.replace(/[^0-9.,]/g, ''))}
              placeholder="0,00 €"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.addMoneyButtons}>
              <Button
                title="Odustani"
                variant="ghost"
                onPress={() => { setShowAddMoney(null); setAddMoneyAmount(''); setAddMoneyAccountId(''); }}
              />
              <Button
                title="Dodaj"
                variant="primary"
                onPress={handleAddMoney}
                disabled={!addMoneyAmount || !addMoneyAccountId}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  title: { ...Typography.heading1 },
  addButton: { ...Typography.body, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.base },
  sectionTitle: { ...Typography.subtitle },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTitle: { ...Typography.heading3, marginBottom: Spacing.sm },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  modalClose: { ...Typography.body, fontWeight: '500' },
  modalTitle: { ...Typography.subtitle },
  modalContent: { paddingHorizontal: Spacing.base },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    ...Typography.body,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  emojiText: { fontSize: 22 },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  calcText: {
    ...Typography.body,
    lineHeight: 22,
  },

  // Add money modal
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  addMoneyModal: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  addMoneyTitle: {
    ...Typography.heading3,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  addMoneyLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  accountPickerRow: {
    marginBottom: Spacing.md,
    maxHeight: 70,
  },
  accountChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginRight: Spacing.sm,
    alignItems: 'center',
    minWidth: 100,
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accountChipBalance: {
    fontSize: 11,
    marginTop: 2,
  },
  addMoneyInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  addMoneyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});
