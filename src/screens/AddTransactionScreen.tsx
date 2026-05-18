import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks';
import { useAuthStore, useAccountStore, useTransactionStore } from '../store';
import { Typography, Spacing, BorderRadius } from '../constants';
import { Button } from '../components/atoms';
import { CategoryPicker } from '../components/molecules/CategoryPicker';
import { AccountPicker } from '../components/molecules/AccountPicker';
import { createTransaction } from '../services/transactionService';
import { getAccounts } from '../services/accountService';
import { autoDetectCategory } from '../services/autoCategory';
import type { TransactionType, TransactionScope } from '../types';

interface AddTransactionScreenProps {
  onClose: () => void;
  initialType?: TransactionType;
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  onClose,
  initialType = 'expense',
}) => {
  const { colors } = useAppTheme();
  const { currentUser } = useAuthStore();
  const { accounts, setAccounts } = useAccountStore();
  const { addTransaction } = useTransactionStore();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>();
  const [accountId, setAccountId] = useState('');

  // Load accounts from DB if store is empty
  useEffect(() => {
    const loadAccounts = async () => {
      if (!currentUser) return;
      if (accounts.length === 0) {
        const accs = await getAccounts(currentUser.id);
        setAccounts(accs);
      }
    };
    loadAccounts();
  }, [currentUser]);

  // Set default account once accounts are available
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const defaultAcc = accounts.find((a) => a.isDefault);
      setAccountId(defaultAcc?.id || accounts[0].id);
    }
  }, [accounts]);
  const [scope, setScope] = useState<TransactionScope>('shared');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-kategorija kad se promijeni opis
  useEffect(() => {
    if (description.length >= 3 && !categoryId) {
      const result = autoDetectCategory(description);
      if (result) {
        setCategoryId(result.categoryId);
        setSubcategoryId(result.subcategoryId);
      }
    }
  }, [description]);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setAmount(cleaned);
  };

  const handleSubmit = async () => {
    if (!currentUser || !amount || !categoryId || !accountId) {
      Alert.alert('Greška', 'Popunite iznos, kategoriju i račun.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Greška', 'Unesite ispravan iznos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const id = await createTransaction({
        userId: currentUser.id,
        accountId,
        type,
        scope,
        amount: parsedAmount,
        currency: 'EUR',
        categoryId,
        subcategoryId,
        description: description || categoryId,
        note: note || undefined,
        date,
        tags: tagList,
        isRecurring: false,
      });

      // Ažuriraj lokalni store
      addTransaction({
        id,
        userId: currentUser.id,
        accountId,
        type,
        scope,
        amount: parsedAmount,
        currency: 'EUR',
        categoryId,
        subcategoryId,
        description: description || categoryId,
        note: note || undefined,
        date,
        tags: tagList,
        isRecurring: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Ažuriraj stanje računa u storeu
      const { updateAccount } = useAccountStore.getState();
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        const change = type === 'income' ? parsedAmount : -parsedAmount;
        updateAccount(accountId, { balance: acc.balance + change });
      }

      onClose();
    } catch (err) {
      console.error('Error creating transaction:', err);
      Alert.alert('Greška', 'Nije moguće spremiti transakciju.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions: { value: TransactionType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { value: 'expense', icon: 'trending-down-outline', label: 'Rashod' },
    { value: 'income', icon: 'trending-up-outline', label: 'Prihod' },
    { value: 'transfer', icon: 'swap-horizontal-outline', label: 'Transfer' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.headerButton, { color: colors.textSecondary }]}>Odustani</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nova transakcija</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tip transakcije */}
          <View style={styles.typeRow}>
            {typeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: type === opt.value ? colors.primary : colors.surfaceVariant,
                    borderColor: type === opt.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setType(opt.value)}
                activeOpacity={0.7}
              >
                <Ionicons name={opt.icon} size={20} color={type === opt.value ? colors.textOnPrimary : colors.text} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    styles.typeLabel,
                    { color: type === opt.value ? colors.textOnPrimary : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Iznos */}
          <View style={styles.amountContainer}>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0,00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={[styles.amountCurrency, { color: colors.textSecondary }]}>€</Text>
          </View>

          {/* Scope: osobno / zajedničko */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Za koga?</Text>
            <View style={styles.scopeRow}>
              {([
                { value: 'shared' as TransactionScope, icon: 'home-outline' as keyof typeof Ionicons.glyphMap, label: 'Zajedničko' },
                { value: 'personal' as TransactionScope, icon: 'person-outline' as keyof typeof Ionicons.glyphMap, label: 'Osobno' },
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.scopeOption,
                    {
                      backgroundColor: scope === opt.value ? colors.primary + '15' : colors.surface,
                      borderColor: scope === opt.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setScope(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon} size={20} color={scope === opt.value ? colors.primary : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.scopeLabel,
                      { color: scope === opt.value ? colors.primary : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Kategorija */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Kategorija</Text>
            <CategoryPicker
              selectedCategoryId={categoryId}
              selectedSubcategoryId={subcategoryId}
              type={type === 'income' ? 'income' : 'expense'}
              onSelect={(catId, subId) => {
                setCategoryId(catId);
                setSubcategoryId(subId);
              }}
            />
          </View>

          {/* Račun */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Račun</Text>
            <AccountPicker
              selectedAccountId={accountId}
              onSelect={setAccountId}
            />
          </View>

          {/* Opis */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Opis</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={description}
              onChangeText={setDescription}
              placeholder="npr. Konzum namirnice"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Datum */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Datum</Text>
            <View style={styles.dateRow}>
              {['Danas', 'Jučer'].map((label, i) => {
                const d = new Date();
                if (i === 1) d.setDate(d.getDate() - 1);
                const dateStr = d.toISOString().split('T')[0];
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: date === dateStr ? colors.primary : colors.surface,
                        borderColor: date === dateStr ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setDate(dateStr)}
                  >
                    <Text
                      style={{
                        color: date === dateStr ? colors.textOnPrimary : colors.text,
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TextInput
                style={[
                  styles.dateInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Bilješka */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bilješka (opcionalno)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={note}
              onChangeText={setNote}
              placeholder="Dodatne informacije..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </View>

          {/* Oznake */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Oznake (opcionalno, odvojene zarezom)
            </Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={tags}
              onChangeText={setTags}
              placeholder="npr. odmor, auto"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={{ height: Spacing['2xl'] }} />
        </ScrollView>

        {/* Submit gumb */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title={type === 'income' ? 'Dodaj prihod' : 'Dodaj rashod'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!amount || !categoryId || !accountId}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    ...Typography.body,
    fontWeight: '500',
  },
  headerTitle: {
    ...Typography.subtitle,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.base,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 120,
    letterSpacing: -1,
  },
  amountCurrency: {
    fontSize: 32,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  fieldGroup: {
    marginBottom: Spacing.base,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    ...Typography.body,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scopeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  scopeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  dateChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  footer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
});
