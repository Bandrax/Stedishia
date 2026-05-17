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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks';
import { useAuthStore, useAccountStore } from '../store';
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

const ACCOUNT_TYPES: Array<{ type: AccountType; label: string; emoji: string }> = [
  { type: 'checking', label: 'Tekući račun', emoji: '🏦' },
  { type: 'savings', label: 'Štedni račun', emoji: '🐷' },
  { type: 'cash', label: 'Gotovina', emoji: '💵' },
  { type: 'credit_card', label: 'Kreditna kartica', emoji: '💳' },
];

const DEBT_TYPES: Array<{ type: Debt['type']; label: string; emoji: string }> = [
  { type: 'mortgage', label: 'Stambeni kredit', emoji: '🏠' },
  { type: 'personal_loan', label: 'Osobni kredit', emoji: '📝' },
  { type: 'car_loan', label: 'Auto kredit', emoji: '🚗' },
  { type: 'credit_card', label: 'Kreditna kartica', emoji: '💳' },
  { type: 'other', label: 'Ostalo', emoji: '📋' },
];

const ACCOUNT_COLORS = ['#0F4C3A', '#1A6B52', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4', '#795548'];

export const AccountsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { setAccounts } = useAccountStore();
  const userId = currentUser?.id || '';

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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      currency: 'EUR',
      color: accColor,
      icon: ACCOUNT_TYPES.find((t) => t.type === accType)?.emoji || '🏦',
      isDefault: accounts.length === 0,
      includeInTotal: accIncludeInTotal,
    });

    setShowAddAccount(false);
    resetAccountForm();
    loadData();
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      'Obriši račun',
      `Jeste li sigurni da želite obrisati "${account.name}"?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            await deleteAccountById(account.id);
            loadData();
          },
        },
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
      'Obriši dug',
      `Jeste li sigurni da želite obrisati "${debt.name}"?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
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

  const tabs: Array<{ key: ScreenTab; label: string; emoji: string }> = [
    { key: 'accounts', label: 'Računi', emoji: '🏦' },
    { key: 'debts', label: 'Dugovi', emoji: '💸' },
    { key: 'subscriptions', label: 'Pretplate', emoji: '🔄' },
  ];

  const getFrequencyLabel = (f: string) => {
    const labels: Record<string, string> = {
      weekly: 'Tjedno', biweekly: 'Dvotjedno', monthly: 'Mjesečno',
      quarterly: 'Kvartalno', yearly: 'Godišnje',
    };
    return labels[f] || f;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Natrag</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Financije</Text>
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
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
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
              <Text style={styles.totalLabel}>Ukupno stanje</Text>
              <Text style={styles.totalAmount}>{formatAmount(totalBalance)}</Text>
              <Text style={styles.totalSub}>{accounts.length} računa</Text>
            </View>

            {/* Lista računa */}
            {accounts.map((account) => {
              const typeInfo = ACCOUNT_TYPES.find((t) => t.type === account.type);
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onLongPress={() => handleDeleteAccount(account)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.accountIcon, { backgroundColor: account.color + '20' }]}>
                    <Text style={styles.accountEmoji}>{typeInfo?.emoji || '🏦'}</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.accountType, { color: colors.textSecondary }]}>
                      {typeInfo?.label || account.type}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.accountBalance,
                      { color: account.balance >= 0 ? colors.success : colors.error },
                    ]}
                  >
                    {formatAmount(account.balance)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Button
              title="+ Dodaj račun"
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
                <Text style={styles.totalLabel}>Ukupni dugovi</Text>
                <Text style={styles.totalAmount}>{formatAmount(totalDebt)}</Text>
                <Text style={styles.totalSub}>{debts.length} obveza</Text>
              </View>
            )}

            {/* Strategije otplate */}
            {strategyComparison && debts.length > 1 && (
              <View style={[styles.strategyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.strategyTitle, { color: colors.text }]}>
                  🧮 Usporedba strategija otplate
                </Text>

                <View style={styles.strategyRow}>
                  <View style={[styles.strategyBox, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={styles.strategyEmoji}>⛄</Text>
                    <Text style={[styles.strategyName, { color: colors.text }]}>Snowball</Text>
                    <Text style={[styles.strategyDesc, { color: colors.textSecondary }]}>
                      Najmanji dug prvo
                    </Text>
                    <Text style={[styles.strategyMonths, { color: colors.primary }]}>
                      {strategyComparison.snowball.monthsToPayoff} mj.
                    </Text>
                    <Text style={[styles.strategyInterest, { color: colors.error }]}>
                      Kamata: {formatAmount(strategyComparison.snowball.totalInterest)}
                    </Text>
                  </View>

                  <View style={[styles.strategyBox, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={styles.strategyEmoji}>🏔️</Text>
                    <Text style={[styles.strategyName, { color: colors.text }]}>Avalanche</Text>
                    <Text style={[styles.strategyDesc, { color: colors.textSecondary }]}>
                      Najveća kamata prvo
                    </Text>
                    <Text style={[styles.strategyMonths, { color: colors.primary }]}>
                      {strategyComparison.avalanche.monthsToPayoff} mj.
                    </Text>
                    <Text style={[styles.strategyInterest, { color: colors.error }]}>
                      Kamata: {formatAmount(strategyComparison.avalanche.totalInterest)}
                    </Text>
                  </View>
                </View>

                {strategyComparison.savings > 0 && (
                  <View style={[styles.savingsHint, { backgroundColor: colors.success + '15' }]}>
                    <Text style={[styles.savingsHintText, { color: colors.success }]}>
                      💡 Avalanche strategija štedi {formatAmount(strategyComparison.savings)} na kamatama!
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
                    <Text style={styles.debtEmoji}>{typeInfo?.emoji || '📋'}</Text>
                    <View style={styles.debtInfo}>
                      <Text style={[styles.debtName, { color: colors.text }]}>{debt.name}</Text>
                      <Text style={[styles.debtType, { color: colors.textSecondary }]}>
                        {typeInfo?.label} • {debt.interestRate}% kamata
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
                      {paidPercent.toFixed(0)}% otplaćeno
                    </Text>
                    <TouchableOpacity
                      style={[styles.payButton, { backgroundColor: colors.primary + '15' }]}
                      onPress={() => {
                        setSelectedDebt(debt);
                        setShowPayment(true);
                      }}
                    >
                      <Text style={[styles.payButtonText, { color: colors.primary }]}>Uplati</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {debts.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nemate evidentiranih dugova!
                </Text>
              </View>
            )}

            <Button
              title="+ Dodaj dug/kredit"
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
                <Text style={styles.totalLabel}>Godišnji trošak pretplata</Text>
                <Text style={styles.totalAmount}>{formatAmount(totalYearlySubs)}</Text>
                <Text style={styles.totalSub}>
                  {formatAmount(totalYearlySubs / 12)}/mj • {subscriptions.length} pretplata
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
                    {formatAmount(sub.yearlyTotal)}/god
                  </Text>
                </View>
              </View>
            ))}

            {subscriptions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔄</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nema detektiranih pretplata.{'\n'}Dodajte ponavljajuće transakcije kako bi se prikazale ovdje.
                </Text>
              </View>
            )}

            <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                💡 Pretplate se automatski detektiraju iz vaših ponavljajućih transakcija.
                Pregledajte ih redovito - mnogi ljudi plaćaju pretplate koje ne koriste!
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAddAccount} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novi račun</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="Naziv računa"
              placeholderTextColor={colors.textTertiary}
              value={accName}
              onChangeText={setAccName}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Vrsta računa</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: accType === t.type ? colors.primary + '20' : colors.surfaceVariant,
                      borderColor: accType === t.type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setAccType(t.type)}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, { color: accType === t.type ? colors.primary : colors.text }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="Početni saldo (€)"
              placeholderTextColor={colors.textTertiary}
              value={accBalance}
              onChangeText={setAccBalance}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Boja</Text>
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
              <Text style={[styles.switchLabel, { color: colors.text }]}>Uključi u ukupno stanje</Text>
              <Switch
                value={accIncludeInTotal}
                onValueChange={setAccIncludeInTotal}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Odustani"
                onPress={() => { setShowAddAccount(false); resetAccountForm(); }}
                variant="ghost"
              />
              <Button
                title="Spremi"
                onPress={handleAddAccount}
                disabled={!accName.trim() || !accBalance}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Novi dug/kredit</Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="Naziv (npr. Stambeni kredit)"
                placeholderTextColor={colors.textTertiary}
                value={debtName}
                onChangeText={setDebtName}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Vrsta</Text>
              <View style={styles.typeGrid}>
                {DEBT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: debtType === t.type ? colors.primary + '20' : colors.surfaceVariant,
                        borderColor: debtType === t.type ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setDebtType(t.type)}
                  >
                    <Text style={styles.typeEmoji}>{t.emoji}</Text>
                    <Text style={[styles.typeLabel, { color: debtType === t.type ? colors.primary : colors.text }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="Ukupan iznos kredita (€)"
                placeholderTextColor={colors.textTertiary}
                value={debtTotal}
                onChangeText={setDebtTotal}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="Preostali iznos (€)"
                placeholderTextColor={colors.textTertiary}
                value={debtRemaining}
                onChangeText={setDebtRemaining}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="Godišnja kamata (%)"
                placeholderTextColor={colors.textTertiary}
                value={debtRate}
                onChangeText={setDebtRate}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="Mjesečna rata (€)"
                placeholderTextColor={colors.textTertiary}
                value={debtMinPayment}
                onChangeText={setDebtMinPayment}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                placeholder="Dan dospijeća (1-31)"
                placeholderTextColor={colors.textTertiary}
                value={debtDueDate}
                onChangeText={setDebtDueDate}
                keyboardType="number-pad"
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Odustani"
                  onPress={() => { setShowAddDebt(false); resetDebtForm(); }}
                  variant="ghost"
                />
                <Button
                  title="Spremi"
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
              Uplata za {selectedDebt?.name}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Preostalo: {formatAmount(selectedDebt?.remainingAmount || 0)}
            </Text>

            <TextInput
              style={[styles.input, styles.amountInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="Iznos uplate (€)"
              placeholderTextColor={colors.textTertiary}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Button
                title="Odustani"
                onPress={() => { setShowPayment(false); setPaymentAmount(''); }}
                variant="ghost"
              />
              <Button
                title="Uplati"
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
