import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { colors } = useAppTheme();

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...(fullWidth && { width: '100%' }),
    };

    const sizeStyles: Record<string, ViewStyle> = {
      sm: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 36, borderRadius: BorderRadius.md },
      md: { paddingVertical: 14, paddingHorizontal: 20, minHeight: 48 },
      lg: { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56 },
    };

    const variantStyles: Record<string, ViewStyle> = {
      primary: { backgroundColor: colors.primary },
      secondary: { backgroundColor: colors.accent },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
      },
      ghost: { backgroundColor: 'transparent' },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled && { opacity: 0.5 }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<string, TextStyle> = {
      sm: { fontSize: 13, fontWeight: '600' },
      md: { fontSize: 15, fontWeight: '600' },
      lg: { fontSize: 17, fontWeight: '700' },
    };

    const colorMap: Record<string, string> = {
      primary: colors.textOnPrimary,
      secondary: colors.textOnAccent,
      outline: colors.primary,
      ghost: colors.primary,
    };

    return {
      ...sizeStyles[size],
      color: colorMap[variant],
    };
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textOnPrimary : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon && <Ionicons name={icon as any} size={18} color={getTextStyle().color} style={{ marginRight: 8 }} />}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
