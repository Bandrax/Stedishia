import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface HouseholdOption {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

const options: HouseholdOption[] = [
  {
    id: 'one',
    emoji: '🧑',
    label: 'Samo ja',
    description: 'Pratit ću samo svoje financije',
  },
  {
    id: 'two',
    emoji: '👫',
    label: 'Dvoje nas',
    description: 'Ja i partner/ica — osobno i zajedničko',
  },
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    label: 'Obitelj (3+)',
    description: 'Cijela obitelj na jednom mjestu',
  },
];

interface HouseholdStepProps {
  selected: string;
  onSelect: (id: string) => void;
}

export const HouseholdStep: React.FC<HouseholdStepProps> = ({
  selected,
  onSelect,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🏠</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Koliko vas živi u kućanstvu?
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Ovo nam pomaže prilagoditi savjete za vaše kućanstvo
      </Text>

      <View style={styles.options}>
        {options.map((opt) => {
          const isSelected = selected === opt.id;
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
              onPress={() => onSelect(opt.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
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
                <Text style={{ fontSize: 20 }}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
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
  options: {
    gap: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  optionEmoji: {
    fontSize: 32,
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
});
