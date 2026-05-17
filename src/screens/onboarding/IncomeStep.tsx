import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NumericInput } from '../../components/atoms';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';

interface IncomeStepProps {
  income: string;
  onIncomeChange: (value: string) => void;
}

export const IncomeStep: React.FC<IncomeStepProps> = ({ income, onIncomeChange }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💵</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Koliki su vam mjesečni prihodi?
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Unesite ukupni neto iznos koji primate svaki mjesec (plaća, honorari i sl.)
      </Text>

      <NumericInput
        value={income}
        onChangeValue={onIncomeChange}
        large
        placeholder="0"
        suffix="€"
        style={styles.input}
      />

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          💡 Ovo je samo početna procjena. Možete je promijeniti bilo kad u postavkama.
          Ako ne znate točan iznos, upišite okvirni.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
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
    marginBottom: Spacing['2xl'],
  },
  input: {
    marginBottom: Spacing.xl,
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
