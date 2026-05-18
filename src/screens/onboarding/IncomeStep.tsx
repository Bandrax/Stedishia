import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NumericInput } from '../../components/atoms';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

type IncomeType = 'fixed' | 'variable' | 'none';

interface IncomeOption {
  id: IncomeType;
  icon: string;
  label: string;
  description: string;
}

const incomeOptions: IncomeOption[] = [
  {
    id: 'fixed',
    icon: 'briefcase-outline',
    label: 'Fiksna plaća',
    description: 'Primam redovitu plaću svaki mjesec',
  },
  {
    id: 'variable',
    icon: 'bar-chart-outline',
    label: 'Varijabilni prihodi',
    description: 'Freelance, sezonski rad, provizije...',
  },
  {
    id: 'none',
    icon: 'school-outline',
    label: 'Nemam redovite prihode',
    description: 'Student, između poslova, umirovljenik...',
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Ionicons name="cash-outline" size={48} color={colors.primary} style={{ marginBottom: Spacing.lg }} />
      <Text style={[styles.title, { color: colors.text }]}>
        Kakvi su vaši prihodi?
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Odaberite opciju koja vam najbolje odgovara
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
                  {opt.label}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  {opt.description}
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
            Kolika je vaša mjesečna neto plaća?
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
            Koliko otprilike zaradite mjesečno?
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
            Okvirni prosjek je sasvim dovoljan
          </Text>
        </View>
      )}

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          Ovo služi samo za pametnije savjete — možete promijeniti kad god želite u postavkama.
          {incomeType === 'none'
            ? ' Aplikacija radi odlično i bez informacije o prihodima!'
            : ''}
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
