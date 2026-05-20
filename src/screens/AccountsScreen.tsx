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
import { getCurrentCurrency } from '../store/useSettingsStore';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatAmount } from '../utils';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccountById,
} from '../services/accountService';
import {
  getDebts,
  createDebt,
  deleteDebtById,
  makePayment,
  compareStrategies,
  calculateAmortization,
} from '../services/debtService';
import { detectSubscriptions } from '../services/debtService';
import { Button } from '../components/atoms';
import type { Account, AccountType, Debt } from '../types';

type ScreenTab = 'accounts' | 'debts' | 'subscriptions';

const ACCOUNT_TYPES: Array<{ type: AccountType; labelKey: string; icon: string }> = [
  { type: 'checking', labelKey: 'accounts.types.checking', icon: 'business-outline' },
  { type: 'savings', labelKey: 'accounts.types.savings', icon: 'save-outline' },
  { type: 'cash', labelKey: 'accounts.types.cash', icon: 'cash-outline' },
  { type: 'credit_card', labelKey: 'accounts.types.credit_card', icon: 'card-outline' },
];

const DEBT_TYPES: Array<{ type: Debt['type']; labelKey: string; icon: string }> = [
  { type: 'mortgage', labelKey: 'accounts.debtTypes.mortgage', icon: 'home-outline' },
  { type: 'personal_loan', labelKey: 'accounts.debtTypes.personal', icon: 'document-text-outline' },
  { type: 'car_loan', labelKey: 'accounts.debtTypes.car', icon: 'car-outline' },
  { type: 'credit_card', labelKey: 'accounts.debtTypes.credit_card', icon: 'card-outline' },
  { type: 'other', labelKey: 'accounts.debtTypes.other', icon: 'list-outline' },
];

const ACCOUNT_COLORS = ['#0F4C3A', '#1A6B52', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4', '#795548'];

export const AccountsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { setAccounts } = useAccountStore();
  const userId = currentUser?.id || '';
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<ScreenTab>('accounts');
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setLocalAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [subscriptions, setSubscriptions] = useState<Array<{
    id: string; description: string; amount: number; frequency: string;
    categoryId: string; yearlyTotal: number;
  }>>([]);
  const [strategyComparison, setStrategyComparison] = useState<{
    snowball: { totalInterest: number; monthsToPayoff: number };
    avalanche: { totalInterest: number; monthsToPayoff: number };
    savings: number;
  } | null>(null);

  // Modal states
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState<Account | null>(null);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Form states - Account
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('checking');
  const [accBalance, setAccBalance] = useState('');
  const [accColor, setAccColor] = useState(ACCOUNT_COLORS[0]);
  const [accIncludeInTotal, setAccIncludeInTotal] = useState(true);

  // Form states - Debt
  const [debtName, setDebtName] = useState('');
  const [debtType, setDebtType] = useState<Debt['type']>('personal_loan');
  const [debtTotal, setDebtTotal] = useState('');
  const [debtRemaining, setDebtRemaining] = useState('');
  const [debtRate, setDebtRate] = useState('');
  const [debtMinPayment, setDebtMinPayment] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('15');

  // Payment
  const [paymentAmount, setPaymentAmount] = useState('');

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const accs = await getAccounts(userId);
      setLocalAccounts(accs);
      setAccounts(accs);

      const dts = await getDebts(userId);
      setDebts(dts);

      if (dts.length > 0) {
        const comparison = compareStrategies(dts, 0);
        setStrategyComparison(comparison);
      }

      const subs = await detectSubscriptions(userId);
      setSubscriptions(subs);
    } catch (error) {
      console.error('Load error:', error);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddAccount = async () => {
    if (!accName.trim() || !accBalance) return;

    await createAccount({
      userId,
      name: accName.trim(),
      type: accType,
      balance: parseFloat(accBalance) || 0,
      currency: getCurrentCurrency(),
      color: accColor,
      icon: ACCOUNT_TYPES.find((t) => t.type === accType)?.icon || 'business-outline',
      isDefault: accounts.length === 0,
      includeInTotal: accIncludeInTotal,
    });

    setShowAddAccount(false);
    resetAccountForm();
    loadData();
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      t('accounts.deleteAccount'),
      t('accounts.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            // Delete transactions tied to this account
            const { getDatabase } = await import('../services/database');
            const db = await getDatabase();
            await db.runAsync('DELETE FROM transactions WHERE account_id = ?', [account.id]);
            await deleteAccountById(account.id);
            loadData();
          },
        },
      ]
    );
  };

  const handleEditAccount = (account: Account) => {
    setAccName(account.name);
    setAccType(account.type);
    setAccBalance(String(account.balance));
    setAccColor(account.color);
    setAccIncludeInTotal(account.includeInTotal);
    setShowEditAccount(account);
  };

  const handleSaveEditAccount = async () => {
    if (!showEditAccount || !accName.trim()) return;
    const newBalance = parseFloat(accBalance.replace(',', '.')) || 0;

    await updateAccount(showEditAccount.id, {
      name: accName.trim(),
      type: accType,
      balance: newBalance,
      color: accColor,
      includeInTotal: accIncludeInTotal,
      icon: ACCOUNT_TYPES.find((t) => t.type === accType)?.icon || 'business-outline',
    });

    setShowEditAccount(null);
    resetAccountForm();
    loadData();
  };

  const handleAccountPress = (account: Account) => {
    Alert.alert(
      account.name,
      t('accounts.balanceLabel', { amount: formatAmount(account.balance) }),
      [
        { text: t('accounts.actionClose'), style: 'cancel' },
        { text: t('common.edit'), onPress: () => handleEditAccount(account) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDeleteAccount(account) },
      ]
    );
  };

  const handleAddDebt = async () => {
    if (!debtName.trim() || !debtTotal || !debtMinPayment) return;

    const total = parseFloat(debtTotal) || 0;
    const remaining = parseFloat(debtRemaining) || total;

    await createDebt({
      userId,
      name: debtName.trim(),
      type: debtType,
      totalAmount: total,
      remainingAmount: remaining,
      interestRate: parseFloat(debtRate) || 0,
      minimumPayment: parseFloat(debtMinPayment) || 0,
      dueDate: debtDueDate,
      startDate: new Date().toISOString().split('T')[0],
    });

    setShowAddDebt(false);
    resetDebtForm();
    loadData();
  };

  const handleDeleteDebt = (debt: Debt) => {
    Alert.alert(
      t('accounts.deleteDebt'),
      t('accounts.deleteDebtConfirm', { name: debt.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteDebtById(debt.id);
            loadData();
          },
        },
      ]
    );
  };

  const handleMakePayment = async () => {
    if (!selectedDebt || !paymentAmount) return;
    await makePayment(selectedDebt.id, parseFloat(paymentAmount) || 0);
    setShowPayment(false);
    setPaymentAmount('');
    setSelectedDebt(null);
    loadData();
  };

  const resetAccountForm = () => {
    setAccName('');
    setAccType('checking');
    setAccBalance('');
    setAccColor(ACCOUNT_COLORS[0]);
    setAccIncludeInTotal(true);
  };

  const resetDebtForm = () => {
    setDebtName('');
    setDebtType('personal_loan');
    setDebtTotal('');
    setDebtRemaining('');
    setDebtRate('');
    setDebtMinPayment('');
    setDebtDueDate('15');
  };

  const totalBalance = accounts
    .filter((a) => a.includeInTotal)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalYearlySubs = subscriptions.reduce((sum, s) => sum + s.yearlyTotal, 0);

  const tabs: Array<{ key: ScreenTab; label: string; icon: string }> = [
    { key: 'accounts', label: t('accounts.tabAccounts'), icon: 'business-outline' },
    { key: 'debts', label: t('accounts.tabDebts'), icon: 'trending-down-outline' },
    { key: 'subscriptions', label: t('accounts.tabSubscriptions'), icon: 'repeat-outline' },
  ];

  const getFrequencyLabel = (f: string) => {
    return t('recurring.frequencies.' + f, f);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('accounts.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Tabovi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                { backgroundColor: activeTab === tab.key ? colors.primary : colors.surfaceVariant },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? '#FFF' : colors.textSecondary} />
              <Text
                style={[styles.tabLabel, { color: activeTab === tab.key ? '#FFF' : colors.textSecondary }]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* RAČUNI TAB */}
        {activeTab === 'accounts' && (
          <View>
            {/* Ukupno stanje */}
            <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.totalLabel}>{t('accounts.totalBalance')}</Text>
              <Text style={styles.totalAmount}>{formatAmount(totalBalance)}</Text>
              <Text style={styles.totalSub}>{t('accounts.accountCount', { count: accounts.length })}</Text>
            </View>

            {/* Lista računa */}
            {accounts.map((account) => {
              const typeInfo = ACCOUNT_TYPES.find((t) => t.type === account.type);
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleAccountPress(account)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.accountIcon, { backgroundColor: (account.color || colors.primary) + '20' }]}>
                    <Ionicons name={(typeInfo?.icon || 'business-outline') as any} size={22} color={account.color || colors.primary} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                      {typeInfo ? t(typeInfo.labelKey) : account.type}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.accountBalance,
                      { color: account.balance >= 0 ? colors.success : colors.error },
                    ]}
                    numberOfLines={1}
                  >
                    {formatAmount(account.balance)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              );
            })}

            <Button
              title={t('accounts.addAccount')}
              onPress={() => setShowAddAccount(true)}
              variant="outline"
              fullWidth
            />
          </View>
        )}

        {/* DUGOVI TAB */}
        {activeTab === 'debts' && (
          <View>
            {totalDebt > 0 && (
              <View style={[styles.totalCard, { backgroundColor: colors.error }]}>
                <Text style={styles.totalLabel}>{t('accounts.totalDebts')}</Text>
                <Text style={styles.totalAmount}>{formatAmount(totalDebt)}</Text>
                <Text style={styles.totalSub}>{t('accounts.debtCount', { count: debts.length })}</Text>
              </View>
            )}

            {/* Strategije otplate */}
            {strategyComparison && debts.length > 1 && (
              <View style={[styles.strategyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.strategyTitle, { color: colors.text }]}>
                  🧮 {t('accounts.strategyComparison')}
                </Text>

                <View style={styles.strategyRow}>
                  <View style={[styles.strategyBox, { backgroundColor: colors.surfaceVariant }]}>
                    <Ionicons name="snow-outline" size={28} color={colors.primary} style={{ marginBottom: 4 }} />
                    <Text style={[styles.strategyName, { color: colors.text }]}>{t('accounts.snowball')}</Text>
                    <Text style={[styles.strategyDesc, { color: colors.textSecondary }]}>
                      {t('accounts.snowballShort')}
                    </Text>
                    <Text style={[styles.strategyMonths, { color: colors.primary }]}>
                      {strategyComparison.snowball.monthsToPayoff} {t('accounts.months')}
                    </Text>
                    <Text style={[styles.strategyInterest, { color: colors.error }]}>
                      {t('accounts.interest', { amount: formatAmount(strategyComparison.snowball.totalInterest) })}
                    </Text>
                  </View>

                  <View style={[styles.strategyBox, { backgroundColor: colors.surfaceVariant }]}>
                    <Ionicons name="snow-outline" size={28} color={colors.primary} style={{ marginBottom: 4 }} />
                    <Text style={[styles.strategyName, { color: colors.text }]}>{t('accounts.avalanche')}</Text>
                    <Text style={[styles.strategyDesc, { color: colors.textSecondary }]}>
                      {t('accounts.avalancheShort')}
                    </Text>
                    <Text style={[styles.strategyMonths, { color: colors.primary }]}>
                      {strategyComparison.avalanche.monthsToPayoff} {t('accounts.months')}
                    </Text>
                    <Text style={[styles.strategyInterest, { color: colors.error }]}>
                      {t('accounts.interest', { amount: formatAmount(strategyComparison.avalanche.totalInterest) })}
                    </Text>
                  </View>
                </View>

                {strategyComparison.savings > 0 && (
                  <View style={[styles.savingsHint, { backgroundColor: colors.success + '15', flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.success} />
                    <Text style={[styles.savingsHintText, { color: colors.success, flex: 1 }]}>
                      {t('accounts.savedInterest', { amount: formatAmount(strategyComparison.savings) })}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Lista dugova */}
            {debts.map((debt) => {
              const typeInfo = DEBT_TYPES.find((t) => t.type === debt.type);
              const paidPercent = debt.totalAmount > 0
                ? ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100
                : 0;

              return (
                <View
                  key={debt.id}
                  style={[styles.debtCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.debtHeader}>
                    <Ionicons name={(typeInfo?.icon || 'list-outline') as any} size={28} color={colors.primary} style={{ marginRight: Spacing.md }} />
                    <View style={styles.debtInfo}>
                      <Text style={[styles.debtName, { color: colors.text }]}>{debt.name}</Text>
                      <Text style={[styles.debtType, { color: colors.textSecondary }]}>
                        {typeInfo ? t(typeInfo.labelKey) : debt.type} • {t('accounts.debtInterestLabel', { rate: debt.interestRate })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteDebt(debt)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ color: colors.error, fontSize: 18 }}>×</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.debtAmounts}>
                    <Text style={[styles.debtRemaining, { color: colors.error }]}>
                      {formatAmount(debt.remainingAmount)}
                    </Text>
                    <Text style={[styles.debtTotal, { color: colors.textSecondary }]}>
                      / {formatAmount(debt.totalAmount)}
                    </Text>
                  </View>

                  <View style={[styles.debtProgress, { backgroundColor: colors.surfaceVariant }]}>
                    <View
                      style={[styles.debtProgressFill, { width: `${paidPercent}%`, backgroundColor: colors.success }]}
                    />
                  </View>

                  <View style={styles.debtFooter}>
                    <Text style={[styles.debtPaidPercent, { color: colors.textSecondary }]}>
                      {t('accounts.paidPercent', { percent: paidPercent.toFixed(0) })}
                    </Text>
                    <TouchableOpacity
                      style={[styles.payButton, { backgroundColor: colors.primary + '15' }]}
                      onPress={() => {
                        setSelectedDebt(debt);
                        setShowPayment(true);
                      }}
                    >
                      <Text style={[styles.payButtonText, { color: colors.primary }]}>{t('accounts.pay')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {debts.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} style={{ marginBottom: Spacing.md }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('accounts.noDebts')}
                </Text>
              </View>
            )}

            <Button
              title={t('accounts.addDebt')}
              onPress={() => setShowAddDebt(true)}
              variant="outline"
              fullWidth
            />
          </View>
        )}

        {/* PRETPLATE TAB */}
        {activeTab === 'subscriptions' && (
          <View>
            {subscriptions.length > 0 && (
              <View style={[styles.totalCard, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.totalLabel}>{t('accounts.yearlySubscriptionCost')}</Text>
                <Text style={styles.totalAmount}>{formatAmount(totalYearlySubs)}</Text>
                <Text style={styles.totalSub}>
                  {t('accounts.subscriptionSummary', { amount: formatAmount(totalYearlySubs / 12), count: subscriptions.length })}
                </Text>
              </View>
            )}

            {subscriptions.map((sub) => (
              <View
                key={sub.id}
                style={[styles.subCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.subInfo}>
                  <Text style={[styles.subName, { color: colors.text }]}>{sub.description}</Text>
                  <Text style={[styles.subFrequency, { color: colors.textSecondary }]}>
                    {getFrequencyLabel(sub.frequency)}
                  </Text>
                </View>
                <View style={styles.subAmounts}>
                  <Text style={[styles.subAmount, { color: colors.text }]}>
                    {formatAmount(sub.amount)}
                  </Text>
                  <Text style={[styles.subYearly, { color: colors.textSecondary }]}>
                    {formatAmount(sub.yearlyTotal)}{t('accounts.perYear')}
                  </Text>
                </View>
              </View>
            ))}

            {subscriptions.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="repeat-outline" size={40} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('accounts.noSubscriptions')}
                </Text>
              </View>
            )}

            <View style={[styles.hint, { backgroundColor: colors.surfaceVariant, flexDirection: 'row', gap: 6 }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[styles.hintText, { color: colors.textSecondary, flex: 1 }]}>
                {t('accounts.subscriptionHint')}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAddAccount} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('accounts.newAccount')}</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('accounts.accountName')}
              placeholderTextColor={colors.textTertiary}
              value={accName}
              onChangeText={setAccName}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accounts.accountType')}</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: accType === item.type ? colors.primary + '20' : colors.surfaceVariant,
                      borderColor: accType === item.type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAccType(item.type)}
                >
                  <Ionicons name={item.icon as any} size={18} color={accType === item.type ? colors.primary : colors.text} />
                  <Text style={[styles.typeLabel, { color: accType === item.type ? colors.primary : colors.text }]}>
                    {t(item.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('accounts.initialBalance')}
              placeholderTextColor={colors.textTertiary}
              value={accBalance}
              onChangeText={setAccBalance}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accounts.color')}</Text>
            <View style={styles.colorRow}>
              {ACCOUNT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c, borderWidth: accColor === c ? 3 : 0, borderColor: colors.text },
                  ]}
                  onPress={() => setAccColor(c)}
                />
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{t('accounts.includeInTotal')}</Text>
              <Switch
                value={accIncludeInTotal}
                onValueChange={setAccIncludeInTotal}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel')}
                onPress={() => { setShowAddAccount(false); resetAccountForm(); }}
                variant="ghost"
              />
              <Button
                title={t('common.save')}
                onPress={handleAddAccount}
                disabled={!accName.trim() || !accBalance}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Account Modal */}
      <Modal visible={showEditAccount !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('accounts.editAccount')}</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('accounts.accountName')}
              placeholderTextColor={colors.textTertiary}
              value={accName}
              onChangeText={setAccName}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accounts.accountType')}</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: accType === item.type ? colors.primary + '20' : colors.surfaceVariant,
                      borderColor: accType === item.type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAccType(item.type)}
                >
                  <Ionicons name={item.icon as any} size={18} color={accType === item.type ? colors.primary : colors.text} />
                  <Text style={[styles.typeLabel, { color: accType === item.type ? colors.primary : colors.text }]}>
                    {t(item.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('accounts.balance')}
              placeholderTextColor={colors.textTertiary}
              value={accBalance}
              onChangeText={setAccBalance}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accounts.color')}</Text>
            <View style={styles.colorRow}>
              {ACCOUNT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c, borderWidth: accColor === c ? 3 : 0, borderColor: colors.text },
                  ]}
                  onPress={() => setAccColor(c)}
                />
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{t('accounts.includeInTotal')}</Text>
              <Switch
                value={accIncludeInTotal}
                onValueChange={setAccIncludeInTotal}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel')}
                onPress={() => { setShowEditAccount(null); resetAccountForm(); }}
                variant="ghost"
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveEditAccount}
                disabled={!accName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Debt Modal */}
      <Modal visible={showAddDebt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('accounts.newDebt')}</Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('accounts.debtName')}
                placeholderTextColor={colors.textTertiary}
                value={debtName}
                onChangeText={setDebtName}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('accounts.debtType')}</Text>
              <View style={styles.typeGrid}>
                {DEBT_TYPES.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: debtType === item.type ? colors.primary + '20' : colors.surfaceVariant,
                        borderColor: debtType === item.type ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setDebtType(item.type)}
                  >
                    <Ionicons name={item.icon as any} size={18} color={debtType === item.type ? colors.primary : colors.text} />
                    <Text style={[styles.typeLabel, { color: debtType === item.type ? colors.primary : colors.text }]}>
                      {t(item.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('accounts.totalDebtAmount')}
                placeholderTextColor={colors.textTertiary}
                value={debtTotal}
                onChangeText={setDebtTotal}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('accounts.remainingDebt')}
                placeholderTextColor={colors.textTertiary}
                value={debtRemaining}
                onChangeText={setDebtRemaining}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('accounts.interestRate')}
                placeholderTextColor={colors.textTertiary}
                value={debtRate}
                onChangeText={setDebtRate}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('accounts.monthlyPayment')}
                placeholderTextColor={colors.textTertiary}
                value={debtMinPayment}
                onChangeText={setDebtMinPayment}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder={t('accounts.dueDay')}
                placeholderTextColor={colors.textTertiary}
                value={debtDueDate}
                onChangeText={setDebtDueDate}
                keyboardType="number-pad"
              />

              <View style={styles.modalButtons}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => { setShowAddDebt(false); resetDebtForm(); }}
                  variant="ghost"
                />
                <Button
                  title={t('common.save')}
                  onPress={handleAddDebt}
                  disabled={!debtName.trim() || !debtTotal || !debtMinPayment}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('accounts.paymentFor', { name: selectedDebt?.name })}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {t('accounts.remaining', { amount: formatAmount(selectedDebt?.remainingAmount || 0) })}
            </Text>

            <TextInput
              style={[styles.input, styles.amountInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder={t('accounts.paymentAmount')}
              placeholderTextColor={colors.textTertiary}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel')}
                onPress={() => { setShowPayment(false); setPaymentAmount(''); }}
                variant="ghost"
              />
              <Button
                title={t('accounts.pay')}
                onPress={handleMakePayment}
                disabled={!paymentAmount}
              />
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
  content: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, paddingVertical: Spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  totalCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  totalLabel: { color: '#FFFFFFBB', fontSize: 14, marginBottom: 4 },
  totalAmount: { color: '#FFF', fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  totalSub: { color: '#FFFFFF99', fontSize: 13, marginTop: 4 },

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  accountEmoji: { fontSize: 22 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '600' },
  accountType: { fontSize: 12, marginTop: 2 },
  accountBalance: { fontSize: 18, fontWeight: '700' },

  debtCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  debtHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  debtEmoji: { fontSize: 28, marginRight: Spacing.md },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 16, fontWeight: '600' },
  debtType: { fontSize: 12, marginTop: 2 },
  debtAmounts: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  debtRemaining: { fontSize: 22, fontWeight: '700' },
  debtTotal: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  debtProgress: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.sm },
  debtProgressFill: { height: '100%', borderRadius: 4 },
  debtFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  debtPaidPercent: { fontSize: 12, fontWeight: '500' },
  payButton: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  payButtonText: { fontSize: 14, fontWeight: '700' },

  strategyCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  strategyTitle: { ...Typography.subtitle, marginBottom: Spacing.md },
  strategyRow: { flexDirection: 'row', gap: Spacing.sm },
  strategyBox: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  strategyEmoji: { fontSize: 28, marginBottom: 4 },
  strategyName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  strategyDesc: { fontSize: 11, marginBottom: Spacing.sm },
  strategyMonths: { fontSize: 18, fontWeight: '700' },
  strategyInterest: { fontSize: 11, marginTop: 4 },
  savingsHint: { padding: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  savingsHintText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  subCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  subInfo: { flex: 1 },
  subName: { fontSize: 15, fontWeight: '600' },
  subFrequency: { fontSize: 12, marginTop: 2 },
  subAmounts: { alignItems: 'flex-end' },
  subAmount: { fontSize: 16, fontWeight: '700' },
  subYearly: { fontSize: 11, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  hint: { padding: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  hintText: { fontSize: 12, lineHeight: 18 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: { ...Typography.heading2, marginBottom: Spacing.md },
  modalSubtitle: { fontSize: 14, marginBottom: Spacing.md },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: Spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  typeEmoji: { fontSize: 18 },
  typeLabel: { fontSize: 13, fontWeight: '500' },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
});
