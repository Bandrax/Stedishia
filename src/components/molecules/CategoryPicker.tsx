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
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks';
import {
  Typography,
  Spacing,
  BorderRadius,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../../constants';
import type { Category, SubCategory } from '../../constants';
import { CategoryIcon } from '../atoms';

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
  const { t } = useTranslation();
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
        <View style={styles.triggerContent}>
          {selected ? (
            <>
              <CategoryIcon categoryId={selected.id} size={18} color={colors.text} />
              <Text style={[styles.triggerText, { color: colors.text, marginLeft: 8 }]}>
                {selected.name}
              </Text>
            </>
          ) : (
            <Text style={[styles.triggerText, { color: colors.textTertiary }]}>
              {t('categories.selectCategory')}
            </Text>
          )}
        </View>
        <Text style={{ color: colors.textTertiary }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('categories.selectCategory')}
            </Text>
            <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
              <Text style={[styles.closeButton, { color: colors.primary }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('categories.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
          />

          {/* Category list */}
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
                    <CategoryIcon categoryId={item.id} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.catName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  {selectedCategoryId === item.id && !selectedSubcategoryId && (
                    <Text style={{ color: colors.primary }}>✓</Text>
                  )}
                </TouchableOpacity>

                {/* Subcategories */}
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
                    <View style={styles.subEmoji}>
                      <CategoryIcon categoryId={item.id} subcategoryId={sub.id} size={16} color={colors.textSecondary} />
                    </View>
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
    marginRight: Spacing.sm,
  },
  subName: {
    ...Typography.body,
    flex: 1,
  },
});
