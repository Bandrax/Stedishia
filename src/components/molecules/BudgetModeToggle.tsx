import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      icon: 'mail-outline' as const,
      label: 'Kuverte',
      description: 'Rasporedi svaki euro',
    },
    {
      value: '50-30-20' as const,
      icon: 'bar-chart-outline' as const,
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
          <Ionicons name={m.icon} size={24} color={mode === m.value ? colors.primary : colors.textSecondary} />
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
  iconWrap: {
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
