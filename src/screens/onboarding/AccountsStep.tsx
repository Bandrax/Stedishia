import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { Button } from '../../components/atoms';
import type { AccountType } from '../../types';

interface AccountSetup {
  id: string;
  name: string;
  type: AccountType;
  balance: string;
  emoji: string;
}

const accountTemplates: { type: AccountType; emoji: string; label: string }[] = [
  { type: 'checking', emoji: '🏦', label: 'Tekući račun' },
  { type: 'savings', emoji: '🐷', label: 'Štedni račun' },
  { type: 'cash', emoji: '💵', label: 'Gotovina' },
  { type: 'credit_card', emoji: '💳', label: 'Kreditna kartica' },
];

interface AccountsStepProps {
  accounts: AccountSetup[];
  onAccountsChange: (accounts: AccountSetup[]) => void;
}

export const AccountsStep: React.FC<AccountsStepProps> = ({
  accounts,
  onAccountsChange,
}) => {
  const { colors } = useAppTheme();

  const addAccount = (type: AccountType) => {
    const template = accountTemplates.find((t) => t.type === type)!;
    const newAccount: AccountSetup = {
      id: `${type}_${Date.now()}`,
      name: template.label,
      type: template.type,
      balance: '',
      emoji: template.emoji,
    };
    onAccountsChange([...accounts, newAccount]);
  };

  const updateBalance = (id: string, balance: string) => {
    const cleaned = balance.replace(/[^0-9.,]/g, '').replace(',', '.');
    onAccountsChange(
      accounts.map((a) => (a.id === id ? { ...a, balance: cleaned } : a))
    );
  };

  const removeAccount = (id: string) => {
    onAccountsChange(accounts.filter((a) => a.id !== id));
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.emoji}>🏦</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Postavite svoje račune
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Dodajte račune koje koristite i unesite trenutno stanje
      </Text>

      {/* Dodani računi */}
      {accounts.map((account) => (
        <View
          key={account.id}
          style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.accountHeader}>
            <Text style={styles.accountEmoji}>{account.emoji}</Text>
            <Text style={[styles.accountName, { color: colors.text }]}>
              {account.name}
            </Text>
            <TouchableOpacity onPress={() => removeAccount(account.id)}>
              <Text style={{ color: colors.error, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.balanceRow, { borderColor: colors.border }]}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
              Stanje:
            </Text>
            <TextInput
              style={[styles.balanceInput, { color: colors.text }]}
              value={account.balance}
              onChangeText={(val) => updateBalance(account.id, val)}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.currency, { color: colors.textSecondary }]}>€</Text>
          </View>
        </View>
      ))}

      {/* Gumbi za dodavanje */}
      <Text style={[styles.addLabel, { color: colors.textSecondary }]}>
        Dodaj račun:
      </Text>
      <View style={styles.addButtons}>
        {accountTemplates.map((template) => (
          <TouchableOpacity
            key={template.type}
            style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => addAccount(template.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.addEmoji}>{template.emoji}</Text>
            <Text style={[styles.addText, { color: colors.text }]}>
              {template.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {accounts.length === 0 && (
        <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            💡 Dodajte barem jedan račun da biste mogli pratiti transakcije.
            Ne brinite — stanje ne mora biti točno do lipe, okvirno je dovoljno!
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    ...Typography.heading2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  accountCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  accountEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  accountName: {
    ...Typography.subtitle,
    flex: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  balanceLabel: {
    ...Typography.body,
    marginRight: Spacing.sm,
  },
  balanceInput: {
    ...Typography.subtitle,
    flex: 1,
    textAlign: 'right',
    padding: 0,
  },
  currency: {
    ...Typography.subtitle,
    marginLeft: Spacing.xs,
  },
  addLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  addEmoji: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  addText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  hint: {
    padding: Spacing.base,
    borderRadius: 12,
  },
  hintText: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
});
