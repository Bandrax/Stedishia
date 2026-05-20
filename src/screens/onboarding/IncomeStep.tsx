import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NumericInput } from '../../components/atoms';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

type IncomeType = 'fixed' | 'variable' | 'none';

interface IncomeOption {
  id: IncomeType;
  icon: string;
  labelKey: string;
  descriptionKey: string;
}

const incomeOptions: IncomeOption[] = [
  {
    id: 'fixed',
    icon: 'briefcase-outline',
    labelKey: 'onboarding.incomeType.fixed',
    descriptionKey: 'onboarding.incomeTypeDesc.fixed',
  },
  {
    id: 'variable',
    icon: 'bar-chart-outline',
    labelKey: 'onboarding.incomeType.variable',
    descriptionKey: 'onboarding.incomeTypeDesc.variable',
  },
  {
    id: 'none',
    icon: 'school-outline',
    labelKey: 'onboarding.incomeType.none',
    descriptionKey: 'onboarding.incomeTypeDesc.none',
  },
];

interface IncomeStepProps {
  income: string;
  onIncomeChange: (value: string) => void;
  incomeType: IncomeType;
  onIncomeTypeChange: (type: IncomeType) => void;
}

export const IncomeStep: React.FC<IncomeStepProps> = ({
  income,
  onIncomeChange,
  incomeType,
  onIncomeTypeChange,
}) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Ionicons name="cash-outline" size={48} color={colors.primary} style={{ marginBottom: Spacing.lg }} />
      <Text style={[styles.title, { color: colors.text }]}>
        {t('onboarding.incomeTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('onboarding.incomeSubtitle')}
      </Text>

      <View style={styles.options}>
        {incomeOptions.map((opt) => {
          const isSelected = incomeType === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onIncomeTypeChange(opt.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={opt.icon as any} size={28} color={isSelected ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? colors.primary : colors.text },
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  {t(opt.descriptionKey)}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {incomeType === 'fixed' && (
        <View style={styles.amountSection}>
          <Text style={[styles.amountLabel, { color: colors.text }]}>
            {t('onboarding.monthlyNetSalary')}
          </Text>
          <NumericInput
            value={income}
            onChangeValue={onIncomeChange}
            large
            placeholder="0"
            suffix="€"
            style={styles.input}
          />
        </View>
      )}

      {incomeType === 'variable' && (
        <View style={styles.amountSection}>
          <Text style={[styles.amountLabel, { color: colors.text }]}>
            {t('onboarding.monthlyApprox')}
          </Text>
          <NumericInput
            value={income}
            onChangeValue={onIncomeChange}
            large
            placeholder="0"
            suffix="€"
            style={styles.input}
          />
          <Text style={[styles.amountHint, { color: colors.textTertiary }]}>
            {t('onboarding.approxEnough')}
          </Text>
        </View>
      )}

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          {incomeType === 'none'
            ? t('onboarding.incomeHintNone')
            : t('onboarding.incomeHint')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: Spacing.md,
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
  options: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  optionEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...Typography.subtitle,
    marginBottom: 2,
  },
  optionDesc: {
    ...Typography.bodySmall,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  amountSection: {
    marginBottom: Spacing.xl,
  },
  amountLabel: {
    ...Typography.subtitle,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  input: {
    marginBottom: Spacing.xs,
  },
  amountHint: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  hint: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  hintText: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
});
