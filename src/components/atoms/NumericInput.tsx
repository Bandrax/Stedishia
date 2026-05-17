import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface NumericInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  label?: string;
  placeholder?: string;
  suffix?: string;
  large?: boolean;
  style?: ViewStyle;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChangeValue,
  label,
  placeholder = '0',
  suffix = '€',
  large = false,
  style,
}) => {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    // Dozvoli samo brojeve, točku i zarez
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    onChangeValue(cleaned);
  };

  return (
    <View style={style}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          large && styles.inputContainerLarge,
          {
            borderColor: focused ? colors.primary : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TextInput
          style={[
            large ? styles.inputLarge : styles.input,
            { color: colors.text },
          ]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Text
          style={[
            large ? styles.suffixLarge : styles.suffix,
            { color: colors.textSecondary },
          ]}
        >
          {suffix}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  inputContainerLarge: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  input: {
    ...Typography.subtitle,
    flex: 1,
  },
  inputLarge: {
    fontSize: 36,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  suffix: {
    ...Typography.subtitle,
    marginLeft: Spacing.sm,
  },
  suffixLarge: {
    fontSize: 28,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
});
