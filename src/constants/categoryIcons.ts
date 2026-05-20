// Mapping kategorija i potkategorija na Ionicons za "moderni" stil ikona
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Glavne kategorije
export const CATEGORY_IONICONS: Record<string, IoniconName> = {
  // Rashodi
  housing: 'home-outline',
  food: 'restaurant-outline',
  transport: 'car-outline',
  utilities: 'flash-outline',
  health: 'medkit-outline',
  entertainment: 'film-outline',
  clothing: 'shirt-outline',
  education: 'school-outline',
  debt: 'card-outline',
  personal: 'person-outline',
  gifts: 'gift-outline',
  appliances: 'cube-outline',
  used_purchase: 'pricetag-outline',
  other_expense: 'ellipsis-horizontal-circle-outline',

  // Prihodi
  salary: 'wallet-outline',
  freelance: 'laptop-outline',
  bonus: 'trophy-outline',
  investment_income: 'trending-up-outline',
  rental_income: 'business-outline',
  business_income: 'briefcase-outline',
  association_income: 'people-outline',
  used_sale: 'pricetags-outline',
  other_income: 'cash-outline',

  // Posebne
  transfer: 'swap-horizontal-outline',
  savings: 'save-outline',
};

// Potkategorije
export const SUBCATEGORY_IONICONS: Record<string, IoniconName> = {
  // Stanovanje
  rent: 'key-outline',
  mortgage: 'home-outline',
  maintenance: 'construct-outline',
  furniture: 'bed-outline',

  // Hrana
  groceries: 'cart-outline',
  restaurants: 'pizza-outline',
  coffee: 'cafe-outline',
  delivery: 'bicycle-outline',

  // Prijevoz
  fuel: 'speedometer-outline',
  public_transport: 'bus-outline',
  parking: 'location-outline',
  car_maintenance: 'build-outline',

  // Rezije
  electricity: 'thunderstorm-outline',
  water: 'water-outline',
  gas: 'flame-outline',
  internet: 'wifi-outline',
  phone: 'call-outline',
  taxes: 'receipt-outline',

  // Zdravlje
  doctor: 'pulse-outline',
  pharmacy: 'bandage-outline',
  gym: 'barbell-outline',

  // Zabava
  movies: 'videocam-outline',
  subscriptions: 'tv-outline',
  hobbies: 'color-palette-outline',
  going_out: 'beer-outline',

  // Bijela tehnika
  large_appliances: 'cube-outline',
  small_appliances: 'cafe-outline',
  appliance_repair: 'hammer-outline',

  // Polovno - kupovina
  used_vehicle: 'car-sport-outline',
  used_electronics: 'desktop-outline',
  used_clothing: 'shirt-outline',
  used_furniture: 'bed-outline',
  used_other: 'cube-outline',

  // Polovno - prodaja
  sell_vehicle: 'car-sport-outline',
  sell_electronics: 'desktop-outline',
  sell_clothing: 'shirt-outline',
  sell_furniture: 'bed-outline',
  sell_other: 'cube-outline',
};

// Mapping goal emojija na Ionicons za moderni stil
export const GOAL_EMOJI_IONICONS: Record<string, IoniconName> = {
  '🎯': 'flag-outline',
  '✈️': 'airplane-outline',
  '🏠': 'home-outline',
  '🚗': 'car-outline',
  '💻': 'laptop-outline',
  '📚': 'book-outline',
  '🎓': 'school-outline',
  '🏖️': 'sunny-outline',
  '💍': 'heart-outline',
  '🎉': 'sparkles-outline',
  '🎸': 'musical-notes-outline',
  '🐕': 'paw-outline',
  '🛡️': 'shield-outline',
  '🐷': 'save-outline',
};

export const getCategoryIonicon = (categoryId: string): IoniconName =>
  CATEGORY_IONICONS[categoryId] ?? 'ellipsis-horizontal-outline';

export const getSubcategoryIonicon = (subcategoryId: string): IoniconName =>
  SUBCATEGORY_IONICONS[subcategoryId] ?? 'ellipsis-horizontal-outline';

export const getGoalIonicon = (emoji: string): IoniconName =>
  GOAL_EMOJI_IONICONS[emoji] ?? 'flag-outline';
