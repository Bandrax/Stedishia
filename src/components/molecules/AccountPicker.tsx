import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks';
import { useAccountStore } from '../../store';
import { Typography, Spacing, BorderRadius } from '../../constants';
import { formatAmount } from '../../utils';

interface AccountPickerProps {
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
}

export const AccountPicker: React.FC<AccountPickerProps> = ({
  selectedAccountId,
  onSelect,
}) => {
  const { colors } = useAppTheme();
  const { accounts } = useAccountStore();
  const [visible, setVisible] = useState(false);

  const selected = accounts.find((a) => a.id === selectedAccountId);

  const handleSelect = (accountId: string) => {
    onSelect(accountId);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: selectedAccountId ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: selectedAccountId ? colors.text : colors.textTertiary }]}>
          {selected ? `${selected.icon} ${selected.name}` : 'Odaberi račun'}
        </Text>
        <Text style={{ color: colors.textTertiary }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Odaberi račun
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={[styles.closeButton, { color: colors.primary }]}>Zatvori</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.accountItem,
                  selectedAccountId === item.id && {
                    backgroundColor: colors.primary + '10',
                  },
                ]}
                onPress={() => handleSelect(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.accountEmoji}>{item.icon}</Text>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.accountBalance, { color: colors.textSecondary }]}>
                    {formatAmount(item.balance)}
                  </Text>
                </View>
                {selectedAccountId === item.id && (
                  <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  triggerText: {
    ...Typography.body,
    fontWeight: '500',
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  modalTitle: {
    ...Typography.heading3,
  },
  closeButton: {
    ...Typography.body,
    fontWeight: '600',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  accountEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...Typography.subtitle,
  },
  accountBalance: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});
