import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Spacing, BorderRadius } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glass';
  padding?: keyof typeof Spacing | number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'base',
}) => {
  const { colors } = useAppTheme();

  const paddingValue = typeof padding === 'number' ? padding : Spacing[padding];

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.card,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    elevated: {
      backgroundColor: colors.card,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    glass: {
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
  };

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant],
        { padding: paddingValue },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
  },
});
