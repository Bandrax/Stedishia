import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks';
import {
  Typography,
  Spacing,
  BorderRadius,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../../constants';
import type { Category, SubCategory } from '../../constants';

interface CategoryPickerProps {
  selectedCategoryId: string;
  selectedSubcategoryId?: string;
  type: 'expense' | 'income';
  onSelect: (categoryId: string, subcategoryId?: string) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategoryId,
  selectedSubcategoryId,
  type,
  onSelect,
}) => {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const selected = categories.find((c) => c.id === selectedCategoryId);

  const filtered = search
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.nameEn.toLowerCase().includes(search.toLowerCase())
      )
    : categories;

  const handleSelect = (cat: Category, sub?: SubCategory) => {
    onSelect(cat.id, sub?.id);
    setVisible(false);
    setSearch('');
  };

  const selectedLabel = selected
    ? `${selected.emoji} ${selected.name}`
    : 'Odaberi kategoriju';

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: selectedCategoryId ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: selectedCategoryId ? colors.text : colors.textTertiary }]}>
          {selectedLabel}
        </Text>
        <Text style={{ color: colors.textTertiary }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Odaberi kategoriju
            </Text>
            <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
              <Text style={[styles.closeButton, { color: colors.primary }]}>Zatvori</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Pretraži kategorije..."
            placeholderTextColor={colors.textTertiary}
          />

          {/* Lista kategorija */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View>
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    selectedCategoryId === item.id && !selectedSubcategoryId && {
                      backgroundColor: colors.primary + '10',
                    },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catIcon, { backgroundColor: item.color + '20' }]}>
                    <Text style={styles.catEmoji}>{item.emoji}</Text>
                  </View>
                  <Text style={[styles.catName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  {selectedCategoryId === item.id && !selectedSubcategoryId && (
                    <Text style={{ color: colors.primary }}>✓</Text>
                  )}
                </TouchableOpacity>

                {/* Podkategorije */}
                {item.subcategories?.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[
                      styles.subcategoryItem,
                      selectedSubcategoryId === sub.id && {
                        backgroundColor: colors.primary + '10',
                      },
                    ]}
                    onPress={() => handleSelect(item, sub)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subEmoji}>{sub.emoji}</Text>
                    <Text style={[styles.subName, { color: colors.textSecondary }]}>
                      {sub.name}
                    </Text>
                    {selectedSubcategoryId === sub.id && (
                      <Text style={{ color: colors.primary }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
  searchInput: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Typography.body,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  catEmoji: {
    fontSize: 22,
  },
  catName: {
    ...Typography.subtitle,
    flex: 1,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing['3xl'] + Spacing.base,
    paddingRight: Spacing.base,
  },
  subEmoji: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  subName: {
    ...Typography.body,
    flex: 1,
  },
});
