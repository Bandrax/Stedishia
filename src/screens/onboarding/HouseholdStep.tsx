import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface HouseholdOption {
  id: string;
  icon: string;
  label: string;
  description: string;
}

const options: HouseholdOption[] = [
  {
    id: 'one',
    icon: 'person-outline',
    label: 'Samo ja',
    description: 'Pratit ću samo svoje financije',
  },
  {
    id: 'two',
    icon: 'people-outline',
    label: 'Dvoje nas',
    description: 'Ja i partner/ica — osobno i zajedničko',
  },
  {
    id: 'family',
    icon: 'people-circle-outline',
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Ionicons name="home" size={48} color={colors.primary} style={{ marginBottom: Spacing.lg }} />
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
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
});
