import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface SelectableChipProps {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
}

export const SelectableChip: React.FC<SelectableChipProps> = ({
  label,
  emoji,
  selected,
  onPress,
}) => {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text
        style={[
          styles.label,
          { color: selected ? colors.textOnPrimary : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    margin: 4,
  },
  emoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  label: {
    ...Typography.body,
    fontWeight: '500',
  },
});
