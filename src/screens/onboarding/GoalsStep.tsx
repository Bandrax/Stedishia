import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SelectableChip } from '../../components/atoms';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface GoalOption {
  id: string;
  emoji: string;
  label: string;
}

const goalOptions: GoalOption[] = [
  { id: 'saving', emoji: '🐷', label: 'Općenita štednja' },
  { id: 'debtFree', emoji: '🔓', label: 'Otplata dugova' },
  { id: 'apartment', emoji: '🏠', label: 'Kupnja stana/kuće' },
  { id: 'vacation', emoji: '✈️', label: 'Godišnji odmor' },
  { id: 'emergencyFund', emoji: '🛡️', label: 'Sigurnosni fond' },
  { id: 'car', emoji: '🚗', label: 'Kupnja auta' },
  { id: 'education', emoji: '📚', label: 'Edukacija' },
  { id: 'retirement', emoji: '🏖️', label: 'Mirovina' },
];

interface GoalsStepProps {
  selectedGoals: string[];
  onToggleGoal: (goalId: string) => void;
}

export const GoalsStep: React.FC<GoalsStepProps> = ({
  selectedGoals,
  onToggleGoal,
}) => {
  const { colors } = useAppTheme();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.emoji}>🎯</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Koji su vam financijski ciljevi?
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Odaberite jedan ili više ciljeva koje želite postići
      </Text>

      <View style={styles.chips}>
        {goalOptions.map((goal) => (
          <SelectableChip
            key={goal.id}
            label={goal.label}
            emoji={goal.emoji}
            selected={selectedGoals.includes(goal.id)}
            onPress={() => onToggleGoal(goal.id)}
          />
        ))}
      </View>

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          Na temelju vaših ciljeva prilagođavamo savjete i preporuke.
          Možete ih promijeniti kad god želite.
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
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
