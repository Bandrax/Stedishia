import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { useSettingsStore } from '../../store';
import { Typography, Spacing, BorderRadius, getGoalIonicon } from '../../constants';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface SelectableChipProps {
  label: string;
  emoji?: string;
  ionicon?: IoniconName;
  selected: boolean;
  onPress: () => void;
}

export const SelectableChip: React.FC<SelectableChipProps> = ({
  label,
  emoji,
  ionicon,
  selected,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const iconStyle = useSettingsStore((s) => s.iconStyle);

  const renderIcon = () => {
    if (iconStyle === 'modern' && (ionicon || emoji)) {
      const name = ionicon || (emoji ? getGoalIonicon(emoji) : 'flag-outline');
      return (
        <Ionicons
          name={name}
          size={20}
          color={selected ? colors.textOnPrimary : colors.text}
          style={styles.iconMargin}
        />
      );
    }
    if (emoji) return <Text style={styles.emoji}>{emoji}</Text>;
    return null;
  };

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
      {renderIcon()}
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
  iconMargin: {
    marginRight: Spacing.sm,
  },
  label: {
    ...Typography.body,
    fontWeight: '500',
  },
});
