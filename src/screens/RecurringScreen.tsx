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
import { useAuthStore } from '../store';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatAmount, formatDate } from '../utils';
import { getCategoryInfo } from '../services/dashboardService';
import {
  getRecurringTransactions,
  createRecurring,
  deleteRecurring,
  toggleRecurring,
  type RecurringTransaction,
} from '../services/recurringService';
import { Button } from '../components/atoms';

const FREQUENCIES = [
  { key: 'weekly' as const, label: 'Tjedno', multiplier: 52 },
  { key: 'biweekly' as const, label: 'Dvotjedno', multiplier: 26 },
  { key: 'monthly' as const, label: 'Mjesečno', multiplier: 12 },
  { key: 'quarterly' as const, label: 'Kvartalno', multiplier: 4 },
  { key: 'yearly' as const, label: 'Godišnje', multiplier: 1 },
];

export const RecurringScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.id || '';

  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // Form
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>('monthly');
  const [nextDate, setNextDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]
  );

  const loadData = useCallback(async () => {
    if (!userId) return;
    const data = await getRecurringTransactions(userId);
    setTransactions(data);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAdd = async () => {
    if (!desc.trim() || !amount) return;

    await createRecurring({
      userId,
      description: desc.trim(),
      amount: parseFloat(amount) || 0,
      type: txType,
      categoryId: 'other_expense',
      accountId: '',
      frequency,
      nextDueDate: nextDate,
      isActive: true,
    });

    setShowAdd(false);
    setDesc('');
    setAmount('');
    setTxType('expense');
    setFrequency('monthly');
    loadData();
  };

  const handleDelete = (tx: RecurringTransaction) => {
    Alert.alert('Obriši', `Obrisati "${tx.description}"?`, [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: async () => { await deleteRecurring(tx.id); loadData(); },
      },
    ]);
  };

  const handleToggle = async (tx: RecurringTransaction) => {
    await toggleRecurring(tx.id, !tx.isActive);
    loadData();
  };

  const activeTx = transactions.filter((t) => t.isActive);
  const inactiveTx = transactions.filter((t) => !t.isActive);

  const totalMonthly = activeTx.reduce((sum, t) => {
    const freq = FREQUENCIES.find((f) => f.key === t.frequency);
    const monthly = (t.amount * (freq?.multiplier || 12)) / 12;
    return sum + (t.type === 'expense' ? monthly : -monthly);
  }, 0);

  const totalYearly = activeTx.reduce((sum, t) => {
    const freq = FREQUENCIES.find((f) => f.key === t.frequency);
    return sum + (t.type === 'expense' ? t.amount * (freq?.multiplier || 12) : 0);
  }, 0);

  const getFrequencyLabel = (f: string) =>
    FREQUENCIES.find((fr) => fr.key === f)?.label || f;

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Danas';
    if (diff === 1) return 'Sutra';
    if (diff < 0) return `${Math.abs(diff)}d kasni`;
    return `za ${diff}d`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Natrag</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Ponavljajuća</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Text style={[styles.addButton, { color: colors.primary }]}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Sažetak */}
        {activeTx.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Mjesečno</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatAmount(totalMonthly)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Godišnje</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatAmount(totalYearly)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Aktivne */}
        {activeTx.length > 0 && (
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Aktivna plaćanja ({activeTx.length})
          </Text>
        )}

        {activeTx.map((tx) => {
          const catInfo = getCategoryInfo(tx.categoryId);
          const daysText = getDaysUntil(tx.nextDueDate);
          const isOverdue = daysText.includes('kasni');

          return (
            <View
              key={tx.id}
              style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.txHeader}>
                <Text style={styles.txEmoji}>{catInfo?.emoji || '🔄'}</Text>
                <View style={styles.txInfo}>
                  <Text style={[styles.txName, { color: colors.text }]}>{tx.description}</Text>
                  <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
                    {getFrequencyLabel(tx.frequency)} • Sljedeće: {daysText}
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
                  {isOverdue && (
                    <Text style={[styles.overdueTag, { backgroundColor: colors.error + '20', color: colors.error }]}>
                      Kasni!
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.txActions}>
                <Switch
                  value={tx.isActive}
                  onValueChange={() => handleToggle(tx)}
                  trackColor={{ true: colors.primary }}
                />
                <TouchableOpacity onPress={() => handleDelete(tx)}>
                  <Text style={[styles.deleteText, { color: colors.error }]}>Obriši</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Neaktivne */}
        {inactiveTx.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Pauzirane ({inactiveTx.length})
            </Text>
            {inactiveTx.map((tx) => (
              <View
                key={tx.id}
                style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 }]}
              >
                <View style={styles.txHeader}>
                  <Text style={styles.txEmoji}>⏸️</Text>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txName, { color: colors.text }]}>{tx.description}</Text>
                    <Text style={[styles.txMeta, { color: colors.textSecondary }]}>
                      {getFrequencyLabel(tx.frequency)} • Pauzirano
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
                  />
                  <TouchableOpacity onPress={() => handleDelete(tx)}>
                    <Text style={[styles.deleteText, { color: colors.error }]}>Obriši</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔄</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nema ponavljajućih plaćanja</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Dodajte režije, pretplate i redovita plaćanja{'\n'}kako biste ih lakše pratili.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novo ponavljajuće plaćanje</Text>

            {/* Tip */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: txType === 'expense' ? colors.error + '20' : colors.surfaceVariant },
                ]}
                onPress={() => setTxType('expense')}
              >
                <Text style={[styles.typeBtnText, { color: txType === 'expense' ? colors.error : colors.textSecondary }]}>
                  Rashod
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: txType === 'income' ? colors.success + '20' : colors.surfaceVariant },
                ]}
                onPress={() => setTxType('income')}
              >
                <Text style={[styles.typeBtnText, { color: txType === 'income' ? colors.success : colors.textSecondary }]}>
                  Prihod
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="Opis (npr. Netflix, Struja, Plaća)"
              placeholderTextColor={colors.textTertiary}
              value={desc}
              onChangeText={setDesc}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="Iznos (€)"
              placeholderTextColor={colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Učestalost</Text>
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
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
              placeholder="Sljedeći datum (YYYY-MM-DD)"
              placeholderTextColor={colors.textTertiary}
              value={nextDate}
              onChangeText={setNextDate}
            />

            <View style={styles.modalButtons}>
              <Button title="Odustani" onPress={() => setShowAdd(false)} variant="ghost" />
              <Button title="Spremi" onPress={handleAdd} disabled={!desc.trim() || !amount} />
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
  txEmoji: { fontSize: 24, marginRight: Spacing.md },
  txInfo: { flex: 1 },
  txName: { fontSize: 15, fontWeight: '600' },
  txMeta: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#0001',
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
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
});
