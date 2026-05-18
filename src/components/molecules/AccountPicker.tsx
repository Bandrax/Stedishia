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
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.triggerContent}>
          {selected ? (
            <>
              <Ionicons name={(selected.icon || 'business-outline') as any} size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.triggerText, { color: colors.text }]}>{selected.name}</Text>
            </>
          ) : (
            <Text style={[styles.triggerText, { color: colors.textTertiary }]}>Odaberi račun</Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
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
                <View style={[styles.accountIconWrap, { backgroundColor: (item.color || colors.primary) + '20' }]}>
                  <Ionicons name={(item.icon || 'business-outline') as any} size={22} color={item.color || colors.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.accountBalance, { color: colors.textSecondary }]}>
                    {formatAmount(item.balance)}
                  </Text>
                </View>
                {selectedAccountId === item.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
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
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  accountIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
