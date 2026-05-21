import React, { useState, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks';
import { useAuthStore, useAccountStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius, getAccountIonicon } from '../constants';
import { formatAmount } from '../utils';
import { getCategoryInfo } from '../services/dashboardService';
import { getAccounts } from '../services/accountService';
import { CategoryIcon } from '../components/atoms';
import { CategoryPicker } from '../components/molecules';
import {
  getRecurringTransactions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  toggleRecurring,
  getSubscriptionSummary,
  markAsPaid,
  markAsPaidOnly,
  isPaidThisMonth,
} from '../services/recurringService';
import { scheduleAllNotifications } from '../services/notificationService';
import { Button } from '../components/atoms';
import type { RecurringTransaction, Account } from '../types';

const FREQUENCIES = [
  { key: 'weekly' as const, multiplier: 52 },
  { key: 'biweekly' as const, multiplier: 26 },
  { key: 'monthly' as const, multiplier: 12 },
  { key: 'quarterly' as const, multiplier: 4 },
  { key: 'yearly' as const, multiplier: 1 },
];

export const RecurringScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.id || '';

  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccountsList] = useState<Account[]>([]);
  const [subSummary, setSubSummary] = useState<{
    subscriptions: Array<{
      id: string;
      description: string;
      amount: number;
      frequency: string;
      categoryId: string;
      yearlyAmount: number;
      isActive: boolean;
    }>;
    totalMonthly: number;
    totalYearly: number;
  } | null>(null);

  // Form state (shared for create/edit)
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<RecurringTransaction | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>('monthly');
  const [dueDay, setDueDay] = useState(1);
  const [categoryId, setCategoryId] = useState('other_expense');
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>(undefined);

  // Pay modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingTx, setPayingTx] = useState<RecurringTransaction | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');

  const loadData = useCallback(async () => {
    if (!userId) return;
    const [data, summary, accs] = await Promise.all([
      getRecurringTransactions(userId),
      getSubscriptionSummary(userId),
      getAccounts(userId),
    ]);
    setTransactions(data);
    setSubSummary(summary);
    setAccountsList(accs);
    if (accs.length > 0 && !payAccountId) {
      const defaultAcc = accs.find((a) => a.isDefault) || accs[0];
      setPayAccountId(defaultAcc.id);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const computeNextDueDate = (day: number): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const maxDay = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(day, maxDay);
    const candidate = new Date(year, month, clampedDay);
    if (candidate.getTime() <= now.getTime()) {
      const nextMaxDay = new Date(year, month + 2, 0).getDate();
      return new Date(year, month + 1, Math.min(day, nextMaxDay)).toISOString().split('T')[0];
    }
    return candidate.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setDesc('');
    setAmount('');
    setTxType('expense');
    setFrequency('monthly');
    setDueDay(1);
    setCategoryId('other_expense');
    setSubcategoryId(undefined);
    setEditingTx(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (tx: RecurringTransaction) => {
    setEditingTx(tx);
    setDesc(tx.description);
    setAmount(String(tx.amount));
    setTxType(tx.type);
    setFrequency(tx.frequency);
    setDueDay(new Date(tx.nextDueDate).getDate());
    setCategoryId(tx.categoryId);
    setSubcategoryId(tx.subcategoryId);
    setShowModal(true);
  };

  const handleSave = async () => {
    const cleaned = amount.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsedAmount = parseFloat(cleaned);
    if (!desc.trim() || !cleaned || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t('common.error'), t('recurring.invalidInput'));
      return;
    }

    try {
      const nextDueDate = computeNextDueDate(dueDay);

      if (editingTx) {
        await updateRecurring(editingTx.id, {
          description: desc.trim(),
          amount: parsedAmount,
          type: txType,
          categoryId,
          subcategoryId,
          frequency,
          nextDueDate,
        });
      } else {
        await createRecurring({
          userId,
          description: desc.trim(),
          amount: parsedAmount,
          type: txType,
          categoryId,
          subcategoryId,
          accountId: 'none',
          frequency,
          nextDueDate,
          isActive: true,
        });
      }

      setShowModal(false);
      resetForm();
      await loadData();
      if (userId) scheduleAllNotifications(userId).catch(console.error);
    } catch (err) {
      Alert.alert(t('common.error'), t('recurring.saveError', { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  const handleDelete = (tx: RecurringTransaction) => {
    Alert.alert(t('recurring.deleteTitle'), t('recurring.deleteConfirm', { name: tx.description }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteRecurring(tx.id);
          await loadData();
          if (userId) scheduleAllNotifications(userId).catch(console.error);
        },
      },
    ]);
  };

  const handleToggle = async (tx: RecurringTransaction) => {
    await toggleRecurring(tx.id, !tx.isActive);
    await loadData();
    if (userId) scheduleAllNotifications(userId).catch(console.error);
  };

  const openPayModal = (tx: RecurringTransaction) => {
    if (isPaidThisMonth(tx)) {
      Alert.alert(t('recurring.paid'), t('recurring.alreadyPaid'));
      return;
    }
    setPayingTx(tx);
    setPayAmount(String(tx.amount));
    if (accounts.length > 0) {
      const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
      setPayAccountId(defaultAcc.id);
    }
    setShowPayModal(true);
  };

  const handleMarkPaid = async () => {
    if (!payingTx) return;
    const cleaned = payAmount.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsedAmount = parseFloat(cleaned);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t('common.error'), t('recurring.invalidInput'));
      return;
    }

    try {
      await markAsPaid(payingTx.id, parsedAmount, userId, payAccountId);
      setShowPayModal(false);
      setPayingTx(null);
      Alert.alert(t('recurring.paid'), t('recurring.paidSuccess'));
      await loadData();
      if (userId) scheduleAllNotifications(userId).catch(console.error);
    } catch (err) {
      Alert.alert(t('common.error'), String(err));
    }
  };

  const handleMarkPaidOnly = async () => {
    if (!payingTx) return;
    try {
      await markAsPaidOnly(payingTx.id);
      setShowPayModal(false);
      setPayingTx(null);
      await loadData();
      if (userId) scheduleAllNotifications(userId).catch(console.error);
    } catch (err) {
      Alert.alert(t('common.error'), String(err));
    }
  };

  const activeTx = transactions.filter((t) => t.isActive);
  const inactiveTx = transactions.filter((t) => !t.isActive);

  // Separate expense/income totals
  const expenseMonthly = activeTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => {
      const freq = FREQUENCIES.find((f) => f.key === t.frequency);
      return sum + (t.amount * (freq?.multiplier || 12)) / 12;
    }, 0);

  const incomeMonthly = activeTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => {
      const freq = FREQUENCIES.find((f) => f.key === t.frequency);
      return sum + (t.amount * (freq?.multiplier || 12)) / 12;
    }, 0);

  const totalYearly = activeTx.reduce((sum, t) => {
    const freq = FREQUENCIES.find((f) => f.key === t.frequency);
    return sum + (t.type === 'expense' ? t.amount * (freq?.multiplier || 12) : 0);
  }, 0);

  const getFrequencyLabel = (f: string) =>
    t(`recurring.frequencies.${f}` as any, f);

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return t('common.today');
    if (diff === 1) return t('common.tomorrow');
    if (diff < 0) return t('common.daysLate', { days: Math.abs(diff) });
    return t('common.inDays', { days: diff });
  };

  const isOverdue = (tx: RecurringTransaction): boolean => {
    if (isPaidThisMonth(tx)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(tx.nextDueDate).getTime() < today.getTime();
  };

  const isUrgentOverdue = (tx: RecurringTransaction): boolean => {
    if (!isOverdue(tx)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysOverdue = Math.ceil((today.getTime() - new Date(tx.nextDueDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 3;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('recurring.title')}</Text>
        <TouchableOpacity onPress={openCreateModal}>
          <Text style={[styles.addButton, { color: colors.primary }]}>{t('recurring.new')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Pretplate — subscription summary */}
        {subSummary && subSummary.subscriptions.filter((s) => s.isActive).length > 0 ? (
          <View style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.subscriptionHeader}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={[styles.subscriptionTitle, { color: colors.text }]}>
                {t('recurring.subscriptionSummary')}
              </Text>
            </View>

            <View style={styles.subscriptionTotals}>
              <View style={styles.subscriptionTotalItem}>
                <Text style={[styles.subscriptionTotalLabel, { color: colors.textSecondary }]}>
                  {t('recurring.monthlyTotal')}
                </Text>
                <Text style={[styles.subscriptionTotalValue, { color: colors.error }]}>
                  {formatAmount(subSummary.totalMonthly)}{t('recurring.perMonth')}
                </Text>
              </View>
              <View style={[styles.subscriptionDivider, { backgroundColor: colors.border }]} />
              <View style={styles.subscriptionTotalItem}>
                <Text style={[styles.subscriptionTotalLabel, { color: colors.textSecondary }]}>
                  {t('recurring.yearlyTotal')}
                </Text>
                <Text style={[styles.subscriptionTotalValue, { color: colors.error }]}>
                  {formatAmount(subSummary.totalYearly)}{t('recurring.perYear')}
                </Text>
              </View>
            </View>

            {subSummary.subscriptions
              .filter((s) => s.isActive)
              .slice(0, 5)
              .map((sub) => {
                const catInfo = getCategoryInfo(sub.categoryId);
                const monthlyEquiv = sub.yearlyAmount / 12;
                return (
                  <View key={sub.id} style={[styles.subscriptionItem, { borderTopColor: colors.border }]}>
                    <View style={{ marginRight: Spacing.sm }}>
                      <CategoryIcon categoryId={sub.categoryId} size={16} color={catInfo?.color ?? '#607D8B'} />
                    </View>
                    <Text style={[styles.subscriptionName, { color: colors.text }]} numberOfLines={1}>
                      {sub.description}
                    </Text>
                    <View style={styles.subscriptionAmounts}>
                      <Text style={[styles.subscriptionAmountSmall, { color: colors.textSecondary }]}>
                        {formatAmount(monthlyEquiv)}{t('recurring.perMonth')}
                      </Text>
                      <Text style={[styles.subscriptionAmountMain, { color: colors.error }]}>
                        {formatAmount(sub.yearlyAmount)}{t('recurring.perYear')}
                      </Text>
                    </View>
                  </View>
                );
              })}
          </View>
        ) : subSummary && subSummary.subscriptions.length === 0 ? (
          <View style={[styles.subscriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.subscriptionHeader}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={[styles.subscriptionTitle, { color: colors.text }]}>
                {t('recurring.subscriptionSummary')}
              </Text>
            </View>
            <Text style={[styles.noSubscriptionsText, { color: colors.textSecondary }]}>
              {t('recurring.noSubscriptions')}
            </Text>
          </View>
        ) : null}

        {/* Summary — fiksni rashodi / prihodi */}
        {activeTx.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('recurring.fixedExpenses')}</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatAmount(expenseMonthly)}{t('recurring.perMonth')}
                </Text>
              </View>
              {incomeMonthly > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('recurring.fixedIncome')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {formatAmount(incomeMonthly)}{t('recurring.perMonth')}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('recurring.summary.yearly')}</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatAmount(totalYearly)}{t('recurring.perYear')}
              </Text>
            </View>
          </View>
        )}

        {/* Aktivne */}
        {activeTx.length > 0 && (
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('recurring.activePayments', { count: activeTx.length })}
          </Text>
        )}

        {activeTx.map((tx) => {
          const catInfo = getCategoryInfo(tx.categoryId);
          const daysText = getDaysUntil(tx.nextDueDate);
          const paid = isPaidThisMonth(tx);
          const overdue = isOverdue(tx);
          const urgent = isUrgentOverdue(tx);

          return (
            <View
              key={tx.id}
              style={[
                styles.txCard,
                {
                  backgroundColor: urgent ? colors.error + '08' : colors.card,
                  borderColor: urgent ? colors.error + '40' : overdue ? colors.warning + '60' : colors.border,
                },
              ]}
            >
              <View style={styles.txHeader}>
                <View style={styles.txEmoji}>
                  <CategoryIcon categoryId={tx.categoryId} size={22} color={catInfo?.color ?? '#607D8B'} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txName, { color: colors.text }]}>{tx.description}</Text>
                  <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
                    {t('recurring.meta', {
                      frequency: getFrequencyLabel(tx.frequency),
                      day: new Date(tx.nextDueDate).getDate(),
                      due: daysText,
                    })}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'expense' ? colors.error : colors.success },
                    ]}
                  >
                    {tx.type === 'expense' ? '-' : '+'}{formatAmount(tx.amount)}
                  </Text>
                  {paid && (
                    <View style={[styles.statusTag, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} style={{ marginRight: 2 }} />
                      <Text style={[styles.statusTagText, { color: colors.success }]}>
                        {t('recurring.paid')}
                      </Text>
                    </View>
                  )}
                  {!paid && urgent && (
                    <View style={[styles.statusTag, { backgroundColor: colors.error + '20' }]}>
                      <Ionicons name="alert-circle" size={12} color={colors.error} style={{ marginRight: 2 }} />
                      <Text style={[styles.statusTagText, { color: colors.error }]}>
                        {t('recurring.overdueUrgent')}
                      </Text>
                    </View>
                  )}
                  {!paid && overdue && !urgent && (
                    <View style={[styles.statusTag, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.statusTagText, { color: colors.warning }]}>
                        {t('recurring.overdue')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.txActions}>
                {/* Pay button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: paid ? colors.success + '15' : colors.primary + '15' },
                  ]}
                  onPress={() => openPayModal(tx)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={paid ? 'checkmark-circle' : 'cash-outline'}
                    size={16}
                    color={paid ? colors.success : colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.actionBtnText, { color: paid ? colors.success : colors.primary }]}>
                    {t('recurring.markPaid')}
                  </Text>
                </TouchableOpacity>

                {/* Edit button */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => openEditModal(tx)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Toggle */}
                <Switch
                  value={tx.isActive}
                  onValueChange={() => handleToggle(tx)}
                  trackColor={{ true: colors.primary }}
                  style={{ transform: [{ scale: 0.8 }] }}
                />

                {/* Delete */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.error + '10' }]}
                  onPress={() => handleDelete(tx)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Neaktivne */}
        {inactiveTx.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('recurring.paused', { count: inactiveTx.length })}
            </Text>
            {inactiveTx.map((tx) => (
              <View
                key={tx.id}
                style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 }]}
              >
                <View style={styles.txHeader}>
                  <Ionicons name="pause-circle-outline" size={28} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <View style={styles.txInfo}>
                    <Text style={[styles.txName, { color: colors.text }]}>{tx.description}</Text>
                    <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
                      {getFrequencyLabel(tx.frequency)} • {t('recurring.pausedLabel')}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: colors.textSecondary }]}>
                    {formatAmount(tx.amount)}
                  </Text>
                </View>
                <View style={styles.txActions}>
                  <Switch
                    value={tx.isActive}
                    onValueChange={() => handleToggle(tx)}
                    trackColor={{ true: colors.primary }}
                    style={{ transform: [{ scale: 0.8 }] }}
                  />
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.error + '10' }]}
                    onPress={() => handleDelete(tx)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={48} color={colors.textTertiary} style={{ marginBottom: Spacing.base }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('recurring.noPayments')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('recurring.noPaymentsHint')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingTx ? t('recurring.editTitle') : t('recurring.newTitle')}
            </Text>

            {/* Tip */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: txType === 'expense' ? colors.error + '20' : colors.surfaceVariant },
                ]}
                onPress={() => {
                  setTxType('expense');
                  setCategoryId('other_expense');
                  setSubcategoryId(undefined);
                }}
              >
                <Text style={[styles.typeBtnText, { color: txType === 'expense' ? colors.error : colors.textSecondary }]}>
                  {t('recurring.expense')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: txType === 'income' ? colors.success + '20' : colors.surfaceVariant },
                ]}
                onPress={() => {
                  setTxType('income');
                  setCategoryId('salary');
                  setSubcategoryId(undefined);
                }}
              >
                <Text style={[styles.typeBtnText, { color: txType === 'income' ? colors.success : colors.textSecondary }]}>
                  {t('recurring.income')}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('recurring.descriptionPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={desc}
              onChangeText={setDesc}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('recurring.amountPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Category picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('recurring.category')}</Text>
            <CategoryPicker
              selectedCategoryId={categoryId}
              selectedSubcategoryId={subcategoryId}
              type={txType}
              onSelect={(catId, subId) => { setCategoryId(catId); setSubcategoryId(subId || undefined); }}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>{t('recurring.frequency')}</Text>
            <View style={styles.freqRow}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.freqChip,
                    {
                      backgroundColor: frequency === f.key ? colors.primary + '20' : colors.surfaceVariant,
                      borderColor: frequency === f.key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFrequency(f.key)}
                >
                  <Text
                    style={[styles.freqLabel, { color: frequency === f.key ? colors.primary : colors.text }]}
                  >
                    {getFrequencyLabel(f.key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('recurring.dueDay')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayPickerScroll}
              contentContainerStyle={styles.dayPickerContent}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: dueDay === day ? colors.primary : colors.surfaceVariant,
                      borderColor: dueDay === day ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setDueDay(day)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: dueDay === day ? '#fff' : colors.text },
                    ]}
                  >
                    {day}.
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title={t('common.cancel')} onPress={() => { setShowModal(false); resetForm(); }} variant="ghost" />
              <Button
                title={editingTx ? t('recurring.saveChanges') : t('common.save')}
                onPress={handleSave}
                disabled={!desc.trim() || !amount.replace(/[^0-9.,]/g, '')}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Pay Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('recurring.payTitle')}
            </Text>

            {payingTx && (
              <View style={[styles.payInfo, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.payInfoName, { color: colors.text }]}>{payingTx.description}</Text>
                <Text style={[styles.payInfoMeta, { color: colors.textSecondary }]}>
                  {getFrequencyLabel(payingTx.frequency)} • {formatAmount(payingTx.amount)}
                </Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('recurring.payAmount')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder={t('recurring.amountPlaceholder')}
              placeholderTextColor={colors.textTertiary}
            />

            {/* Account picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('recurring.selectAccount')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: payAccountId === acc.id ? colors.primary + '20' : colors.surfaceVariant,
                        borderColor: payAccountId === acc.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPayAccountId(acc.id)}
                  >
                    <Ionicons name={getAccountIonicon(acc.type, acc.icon)} size={16} color={payAccountId === acc.id ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.accountChipText, { color: payAccountId === acc.id ? colors.primary : colors.text }]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.payButtons}>
              <Button
                title={t('recurring.payConfirm')}
                onPress={handleMarkPaid}
                disabled={!payAmount.replace(/[^0-9.,]/g, '')}
              />
              <TouchableOpacity
                style={[styles.paidOnlyBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={handleMarkPaidOnly}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.paidOnlyBtnText, { color: colors.textSecondary }]}>
                  {t('recurring.markPaidNoExpense')}
                </Text>
              </TouchableOpacity>
              <Button title={t('common.cancel')} onPress={() => { setShowPayModal(false); setPayingTx(null); }} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: { fontSize: 16, fontWeight: '600' },
  screenTitle: { ...Typography.heading2 },
  addButton: { fontSize: 14, fontWeight: '700' },
  content: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },

  subscriptionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  subscriptionTitle: {
    ...Typography.subtitle,
  },
  subscriptionTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  subscriptionTotalItem: {
    flex: 1,
    alignItems: 'center',
  },
  subscriptionTotalLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  subscriptionTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  subscriptionDivider: {
    width: 1,
    height: 36,
    marginHorizontal: Spacing.sm,
  },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
  },
  subscriptionName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  subscriptionAmounts: {
    alignItems: 'flex-end',
  },
  subscriptionAmountSmall: {
    fontSize: 11,
  },
  subscriptionAmountMain: {
    fontSize: 14,
    fontWeight: '600',
  },
  noSubscriptionsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700' },

  sectionTitle: { ...Typography.subtitle, marginBottom: Spacing.md, marginTop: Spacing.sm },

  txCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  txHeader: { flexDirection: 'row', alignItems: 'center' },
  txEmoji: { marginRight: Spacing.md },
  txInfo: { flex: 1 },
  txName: { fontSize: 15, fontWeight: '600' },
  txMeta: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700' },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  overdueTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  txActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#0001',
    gap: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteText: { fontSize: 13, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.subtitle, marginBottom: Spacing.xs },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: { ...Typography.heading2, marginBottom: Spacing.lg },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: Spacing.sm },
  typeToggle: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  freqChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  freqLabel: { fontSize: 13, fontWeight: '500' },
  dayPickerScroll: { marginBottom: Spacing.md, maxHeight: 44 },
  dayPickerContent: { gap: 6 },
  dayChip: {
    width: 40,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipText: { fontSize: 14, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },

  // Pay modal
  payInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  payInfoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  payInfoMeta: {
    fontSize: 13,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  payButtons: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  paidOnlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  paidOnlyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
