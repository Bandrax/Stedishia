import React from 'react';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store';
import { getCategoryIonicon, getSubcategoryIonicon } from '../../constants';
import { ALL_DEFAULT_CATEGORIES } from '../../constants';

interface CategoryIconProps {
  categoryId: string;
  subcategoryId?: string;
  size: number;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  categoryId,
  subcategoryId,
  size,
  color,
}) => {
  const iconStyle = useSettingsStore((s) => s.iconStyle);

  if (iconStyle === 'modern') {
    const iconName = subcategoryId
      ? getSubcategoryIonicon(subcategoryId)
      : getCategoryIonicon(categoryId);
    return <Ionicons name={iconName} size={size} color={color ?? '#666'} />;
  }

  // Classic: emoji
  const cat = ALL_DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  if (subcategoryId && cat?.subcategories) {
    const sub = cat.subcategories.find((s) => s.id === subcategoryId);
    if (sub) {
      return <Text style={{ fontSize: size }}>{sub.emoji}</Text>;
    }
  }
  return <Text style={{ fontSize: size }}>{cat?.emoji ?? '📌'}</Text>;
};
