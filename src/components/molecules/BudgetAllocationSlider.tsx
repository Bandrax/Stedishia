import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface BudgetAllocationSliderProps {
  categoryName: string;
  emoji: string;
  color: string;
  currentAllocation: number;
  spent: number;
  onAllocationChange: (amount: number) => void;
}

export const BudgetAllocationSlider: React.FC<BudgetAllocationSliderProps> = ({
  categoryName,
  emoji,
  color,
  currentAllocation,
  spent,
  onAllocationChange,
}) => {
  const { colors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentAllocation));

  const handleSave = () => {
    const parsed = parseFloat(inputValue.replace(',', '.')) || 0;
    onAllocationChange(Math.max(0, parsed));
    setEditing(false);
  };

  const quickAdjust = (delta: number) => {
    const newVal = Math.max(0, currentAllocation + delta);
    onAllocationChange(newVal);
    setInputValue(String(newVal));
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: color + '20' }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {categoryName}
        </Text>
        {spent > 0 && (
          <Text style={[styles.spent, { color: colors.textTertiary }]}>
            Potrošeno: {formatAmount(spent)}
          </Text>
        )}
      </View>

      <View style={styles.controlRow}>
        {/* Minus gumb */}
        <TouchableOpacity
          style={[styles.adjustButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => quickAdjust(-50)}
          activeOpacity={0.6}
        >
          <Text style={[styles.adjustText, { color: colors.text }]}>-50</Text>
        </TouchableOpacity>

        {/* Iznos */}
        {editing ? (
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface }]}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="decimal-pad"
            onBlur={handleSave}
            onSubmitEditing={handleSave}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity
            style={[styles.amountDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              setInputValue(String(currentAllocation));
              setEditing(true);
            }}
          >
            <Text style={[styles.amountText, { color: colors.text }]}>
              {formatAmount(currentAllocation)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Plus gumb */}
        <TouchableOpacity
          style={[styles.adjustButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => quickAdjust(50)}
          activeOpacity={0.6}
        >
          <Text style={[styles.adjustText, { color: colors.text }]}>+50</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  emoji: {
    fontSize: 16,
  },
  name: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  spent: {
    fontSize: 11,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: 32 + Spacing.sm,
  },
  adjustButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  adjustText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountDisplay: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  amountText: {
    ...Typography.subtitle,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    textAlign: 'center',
    ...Typography.subtitle,
  },
});
