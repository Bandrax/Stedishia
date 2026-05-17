import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Spacing, BorderRadius } from '../../constants';

type Scope = 'personal' | 'household';

interface ScopeToggleProps {
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  personalLabel?: string;
  householdLabel?: string;
}

export const ScopeToggle: React.FC<ScopeToggleProps> = ({
  scope,
  onScopeChange,
  personalLabel = 'Osobno',
  householdLabel = 'Kućanstvo',
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
      <TouchableOpacity
        style={[
          styles.option,
          scope === 'personal' && { backgroundColor: colors.card },
          scope === 'personal' && styles.optionActive,
        ]}
        onPress={() => onScopeChange('personal')}
        activeOpacity={0.7}
      >
        <Text style={styles.optionEmoji}>👤</Text>
        <Text
          style={[
            styles.optionText,
            { color: scope === 'personal' ? colors.primary : colors.textTertiary },
          ]}
        >
          {personalLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.option,
          scope === 'household' && { backgroundColor: colors.card },
          scope === 'household' && styles.optionActive,
        ]}
        onPress={() => onScopeChange('household')}
        activeOpacity={0.7}
      >
        <Text style={styles.optionEmoji}>🏠</Text>
        <Text
          style={[
            styles.optionText,
            { color: scope === 'household' ? colors.primary : colors.textTertiary },
          ]}
        >
          {householdLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: 3,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  optionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  optionEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
