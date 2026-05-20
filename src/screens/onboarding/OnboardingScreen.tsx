import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms';
import { useAppTheme } from '../../hooks';
import { useAuthStore, useAccountStore } from '../../store';
import { getCurrentCurrency } from '../../store/useSettingsStore';
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

const TOTAL_STEPS = 7; // 0-6: Welcome, Name, Household, Income, Goals, Accounts, Ready

export const OnboardingScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { setOnboarded, setCurrentUser, setHousehold } = useAuthStore();
  const { setAccounts } = useAccountStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [incomeType, setIncomeType] = useState<'fixed' | 'variable' | 'none'>('fixed');
  const [householdSize, setHouseholdSize] = useState('two');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [accounts, setAccountsLocal] = useState<AccountSetup[]>([
    { id: 'checking_default', name: t('accounts.types.checking'), type: 'checking', balance: '', emoji: 'business-outline' },
    { id: 'cash_default', name: t('accounts.types.cash'), type: 'cash', balance: '', emoji: 'cash-outline' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setAuthenticated } = useAuthStore();

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return name.trim().length >= 2; // Name
      case 2: return true; // Household
      case 3: return true; // Income (all options valid)
      case 4: return true; // Goals (optional)
      case 5: return accounts.length > 0; // Accounts
      case 6: return true; // Ready
      default: return false;
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const userId = Crypto.randomUUID();
      const householdId = Crypto.randomUUID();

      await dbInsert('households', {
        id: householdId,
        name: t('onboarding.householdName', { name }),
        created_at: now,
      });

      const user = {
        id: userId,
        name: name.trim(),
        monthly_income: incomeType === 'none' ? 0 : (parseFloat(income) || 0),
        currency: getCurrentCurrency(),
        household_id: householdId,
        budget_mode: 'envelope',
        biometric_enabled: 0,
        created_at: now,
        updated_at: now,
      };
      await dbInsert('users', user);

      const createdAccounts = [];
      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        const accountData = {
          id: Crypto.randomUUID(),
          user_id: userId,
          name: acc.name,
          type: acc.type,
          balance: parseFloat(acc.balance) || 0,
          currency: getCurrentCurrency(),
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

      await dbInsert('app_settings', {
        key: 'financial_goals',
        value: JSON.stringify(selectedGoals),
      });
      await dbInsert('app_settings', {
        key: 'household_size',
        value: householdSize,
      });
      await dbInsert('app_settings', {
        key: 'income_type',
        value: incomeType,
      });

      setCurrentUser({
        id: userId,
        name: name.trim(),
        monthlyIncome: incomeType === 'none' ? 0 : (parseFloat(income) || 0),
        currency: getCurrentCurrency(),
        householdId,
        budgetMode: 'envelope',
        biometricEnabled: false,
        createdAt: now,
        updatedAt: now,
      });
      setHousehold({
        id: householdId,
        name: t('onboarding.householdName', { name }),
        inviteCode: '',
        members: [userId],
        createdAt: now,
      });
      setAccounts(createdAccounts as any);
      setOnboarded(true);
      setAuthenticated(true);
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert(t('common.error'), t('onboarding.setupError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return (
          <View style={styles.nameContainer}>
            <Ionicons name="hand-left-outline" size={40} color={colors.primary} style={{ marginBottom: Spacing.sm }} />
            <Text style={[styles.nameTitle, { color: colors.text }]}>
              {t('onboarding.whatsYourName')}
            </Text>
            <Text style={[styles.nameSubtitle, { color: colors.textSecondary }]}>
              {t('onboarding.nameUsage')}
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
              placeholder={t('onboarding.yourName')}
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>
        );
      case 2:
        return (
          <HouseholdStep
            selected={householdSize}
            onSelect={setHouseholdSize}
          />
        );
      case 3:
        return (
          <IncomeStep
            income={income}
            onIncomeChange={setIncome}
            incomeType={incomeType}
            onIncomeTypeChange={setIncomeType}
          />
        );
      case 4:
        return (
          <GoalsStep
            selectedGoals={selectedGoals}
            onToggleGoal={toggleGoal}
          />
        );
      case 5:
        return (
          <AccountsStep
            accounts={accounts}
            onAccountsChange={setAccountsLocal}
          />
        );
      case 6:
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
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>
            {t('onboarding.stepOf', { step: step + 1, total: TOTAL_STEPS })}
          </Text>
        </View>

        <View style={styles.content}>
          {renderStep()}
        </View>

        <View style={styles.buttons}>
          {step > 0 ? (
            <View style={styles.buttonRow}>
              <Button
                title={t('common.back')}
                variant="ghost"
                size="md"
                onPress={() => setStep((s) => s - 1)}
                style={styles.backButton}
              />
              <Button
                title={step === TOTAL_STEPS - 1 ? t('onboarding.getStarted') : t('common.next')}
                variant="primary"
                size="lg"
                onPress={step === TOTAL_STEPS - 1 ? handleFinish : () => setStep((s) => s + 1)}
                disabled={!canProceed()}
                loading={isSubmitting}
                style={styles.nextButton}
              />
            </View>
          ) : (
            <Button
              title={t('common.letsStart')}
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => setStep(1)}
            />
          )}
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  buttons: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    paddingHorizontal: Spacing.base,
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
    fontSize: 48,
    textAlign: 'center',
    marginBottom: Spacing.md,
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
