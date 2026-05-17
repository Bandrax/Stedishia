import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface DailyTipCardProps {
  tip: string;
  category?: string;
  onDismiss?: () => void;
}

export const DailyTipCard: React.FC<DailyTipCardProps> = ({
  tip,
  category,
  onDismiss,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.accent + '15' }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>💡</Text>
        <Text style={[styles.title, { color: colors.accent }]}>
          Savjet dana
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.tip, { color: colors.text }]}>
        {tip}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tip: {
    ...Typography.body,
    lineHeight: 22,
  },
});
