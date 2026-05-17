import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface BudgetModeToggleProps {
  mode: 'envelope' | '50-30-20';
  onModeChange: (mode: 'envelope' | '50-30-20') => void;
}

export const BudgetModeToggle: React.FC<BudgetModeToggleProps> = ({
  mode,
  onModeChange,
}) => {
  const { colors } = useAppTheme();

  const modes = [
    {
      value: 'envelope' as const,
      emoji: '✉️',
      label: 'Kuverte',
      description: 'Rasporedi svaki euro',
    },
    {
      value: '50-30-20' as const,
      emoji: '📊',
      label: '50/30/20',
      description: 'Potrebe / Želje / Štednja',
    },
  ];

  return (
    <View style={styles.container}>
      {modes.map((m) => (
        <TouchableOpacity
          key={m.value}
          style={[
            styles.option,
            {
              backgroundColor: mode === m.value ? colors.primary + '12' : colors.surface,
              borderColor: mode === m.value ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onModeChange(m.value)}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>{m.emoji}</Text>
          <Text style={[styles.label, { color: mode === m.value ? colors.primary : colors.text }]}>
            {m.label}
          </Text>
          <Text style={[styles.description, { color: colors.textTertiary }]}>
            {m.description}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    textAlign: 'center',
  },
});
