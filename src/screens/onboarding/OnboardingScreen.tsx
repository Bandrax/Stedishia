import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuid } from 'uuid';
import { Button, ProgressDots } from '../../components/atoms';
import { useAppTheme } from '../../hooks';
import { useAuthStore, useAccountStore } from '../../store';
import { dbInsert } from '../../services/database';
import { Spacing, Typography, BorderRadius } from '../../constants';
import { WelcomeStep } from './WelcomeStep';
import { IncomeStep } from './IncomeStep';
import { HouseholdStep } from './HouseholdStep';
import { GoalsStep } from './GoalsStep';
import { AccountsStep } from './AccountsStep';
import { ReadyStep } from './ReadyStep';
import type { AccountType } from '../../types';

interface AccountSetup {
  id: string;
  name: string;
  type: AccountType;
  balance: string;
  emoji: string;
}

const TOTAL_STEPS = 6; // 0-5: Welcome, Name, Income+Household, Goals, Accounts, Ready

export const OnboardingScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { setOnboarded, setCurrentUser, setHousehold } = useAuthStore();
  const { setAccounts } = useAccountStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [householdSize, setHouseholdSize] = useState('two');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [accounts, setAccountsLocal] = useState<AccountSetup[]>([
    { id: 'checking_default', name: 'Tekući račun', type: 'checking', balance: '', emoji: '🏦' },
    { id: 'cash_default', name: 'Gotovina', type: 'cash', balance: '', emoji: '💵' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return name.trim().length >= 2; // Name
      case 2: return true; // Income + Household (income optional)
      case 3: return true; // Goals (optional)
      case 4: return accounts.length > 0; // Accounts
      case 5: return true; // Ready
      default: return false;
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const userId = uuid();
      const householdId = uuid();

      // Kreiraj kućanstvo
      await dbInsert('households', {
        id: householdId,
        name: `${name} kućanstvo`,
        created_at: now,
      });

      // Kreiraj korisnika
      const user = {
        id: userId,
        name: name.trim(),
        monthly_income: parseFloat(income) || 0,
        currency: 'EUR',
        household_id: householdId,
        budget_mode: 'envelope',
        biometric_enabled: 0,
        created_at: now,
        updated_at: now,
      };
      await dbInsert('users', user);

      // Kreiraj račune
      const createdAccounts = [];
      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        const accountData = {
          id: uuid(),
          user_id: userId,
          name: acc.name,
          type: acc.type,
          balance: parseFloat(acc.balance) || 0,
          currency: 'EUR',
          color: '#0F4C3A',
          icon: acc.emoji,
          is_default: i === 0 ? 1 : 0,
          include_in_total: 1,
          created_at: now,
          updated_at: now,
        };
        await dbInsert('accounts', accountData);
        createdAccounts.push({
          ...accountData,
          isDefault: accountData.is_default === 1,
          includeInTotal: true,
          userId: accountData.user_id,
        });
      }

      // Spremi financijske ciljeve u app_settings
      await dbInsert('app_settings', {
        key: 'financial_goals',
        value: JSON.stringify(selectedGoals),
      });
      await dbInsert('app_settings', {
        key: 'household_size',
        value: householdSize,
      });

      // Ažuriraj store
      setCurrentUser({
        id: userId,
        name: name.trim(),
        monthlyIncome: parseFloat(income) || 0,
        currency: 'EUR',
        householdId,
        budgetMode: 'envelope',
        biometricEnabled: false,
        createdAt: now,
        updatedAt: now,
      });
      setHousehold({
        id: householdId,
        name: `${name} kućanstvo`,
        members: [userId],
        createdAt: now,
      });
      setAccounts(createdAccounts as any);
      setOnboarded(true);
      setAuthenticated(true);
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Privremeno preskačemo auth - postavljamo kao authenticated
  const { setAuthenticated } = useAuthStore();

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return (
          <View style={styles.nameContainer}>
            <Text style={styles.nameEmoji}>👋</Text>
            <Text style={[styles.nameTitle, { color: colors.text }]}>
              Kako se zovete?
            </Text>
            <Text style={[styles.nameSubtitle, { color: colors.textSecondary }]}>
              Ovo ime ćemo koristiti u aplikaciji
            </Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  color: colors.text,
                  borderColor: name.trim().length >= 2 ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Vaše ime"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>
        );
      case 2:
        return (
          <View style={{ flex: 1 }}>
            <IncomeStep income={income} onIncomeChange={setIncome} />
          </View>
        );
      case 3:
        return (
          <GoalsStep
            selectedGoals={selectedGoals}
            onToggleGoal={toggleGoal}
          />
        );
      case 4:
        return (
          <AccountsStep
            accounts={accounts}
            onAccountsChange={setAccountsLocal}
          />
        );
      case 5:
        return (
          <ReadyStep
            userName={name}
            accountCount={accounts.length}
            goalCount={selectedGoals.length}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress indikator */}
        <View style={styles.progressContainer}>
          <ProgressDots total={TOTAL_STEPS} current={step} />
        </View>

        {/* Sadržaj koraka */}
        <View style={styles.content}>
          {renderStep()}
        </View>

        {/* Navigacijski gumbi */}
        <View style={styles.buttons}>
          {step > 0 && (
            <Button
              title="Natrag"
              variant="ghost"
              onPress={() => setStep((s) => s - 1)}
              style={styles.backButton}
            />
          )}
          <Button
            title={step === TOTAL_STEPS - 1 ? 'Započni! 🚀' : 'Dalje'}
            variant="primary"
            size="lg"
            fullWidth={step === 0}
            onPress={step === TOTAL_STEPS - 1 ? handleFinish : () => setStep((s) => s + 1)}
            disabled={!canProceed()}
            loading={isSubmitting}
            style={step > 0 ? styles.nextButton : undefined}
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
  progressContainer: {
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    flex: 0,
    paddingHorizontal: Spacing.lg,
  },
  nextButton: {
    flex: 1,
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  nameEmoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  nameTitle: {
    ...Typography.heading2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  nameSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  nameInput: {
    ...Typography.heading3,
    textAlign: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
});
