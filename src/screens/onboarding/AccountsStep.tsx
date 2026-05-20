import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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

const accountTemplates: { type: AccountType; icon: string; labelKey: string }[] = [
  { type: 'checking', icon: 'business-outline', labelKey: 'accounts.types.checking' },
  { type: 'savings', icon: 'save-outline', labelKey: 'accounts.types.savings' },
  { type: 'cash', icon: 'cash-outline', labelKey: 'accounts.types.cash' },
  { type: 'credit_card', icon: 'card-outline', labelKey: 'accounts.types.credit_card' },
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
  const { t } = useTranslation();

  const addAccount = (type: AccountType) => {
    const template = accountTemplates.find((t) => t.type === type)!;
    const newAccount: AccountSetup = {
      id: `${type}_${Date.now()}`,
      name: t(template.labelKey),
      type: template.type,
      balance: '',
      emoji: template.icon,
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
      <Ionicons name="business" size={48} color={colors.primary} style={{ marginBottom: Spacing.lg }} />
      <Text style={[styles.title, { color: colors.text }]}>
        {t('onboarding.step4Title')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('onboarding.step4Subtitle')}
      </Text>

      {accounts.map((account) => (
        <View
          key={account.id}
          style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.accountHeader}>
            <Ionicons name={(accountTemplates.find(t => t.type === account.type)?.icon || 'cash-outline') as any} size={22} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.accountName, { color: colors.text }]}>
              {account.name}
            </Text>
            <TouchableOpacity onPress={() => removeAccount(account.id)}>
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
          <View style={[styles.balanceRow, { borderColor: colors.border }]}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
              {t('onboarding.balanceLabel')}
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

      <Text style={[styles.addLabel, { color: colors.textSecondary }]}>
        {t('onboarding.addAccount')}
      </Text>
      <View style={styles.addButtons}>
        {accountTemplates.map((template) => (
          <TouchableOpacity
            key={template.type}
            style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => addAccount(template.type)}
            activeOpacity={0.7}
          >
            <Ionicons name={template.icon as any} size={24} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={[styles.addText, { color: colors.text }]}>
              {t(template.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {accounts.length === 0 && (
        <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            {t('onboarding.accountsHint')}
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
