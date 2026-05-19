// Predefinirane kategorije troškova i prihoda
export interface Category {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  color: string;
  type: 'expense' | 'income';
  isDefault: boolean;
  subcategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'housing',
    name: 'Stanovanje',
    nameEn: 'Housing',
    emoji: '🏠',
    color: '#0F4C3A',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'rent', name: 'Najam', nameEn: 'Rent', emoji: '🔑' },
      { id: 'mortgage', name: 'Kredit za stan', nameEn: 'Mortgage', emoji: '🏦' },
      { id: 'maintenance', name: 'Održavanje', nameEn: 'Maintenance', emoji: '🔧' },
      { id: 'furniture', name: 'Namještaj', nameEn: 'Furniture', emoji: '🛋️' },
    ],
  },
  {
    id: 'food',
    name: 'Hrana i piće',
    nameEn: 'Food & Drinks',
    emoji: '🍽️',
    color: '#FF5722',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'groceries', name: 'Namirnice', nameEn: 'Groceries', emoji: '🛒' },
      { id: 'restaurants', name: 'Restorani', nameEn: 'Restaurants', emoji: '🍕' },
      { id: 'coffee', name: 'Kava', nameEn: 'Coffee', emoji: '☕' },
      { id: 'delivery', name: 'Dostava', nameEn: 'Delivery', emoji: '📦' },
    ],
  },
  {
    id: 'transport',
    name: 'Prijevoz',
    nameEn: 'Transport',
    emoji: '🚗',
    color: '#2196F3',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'fuel', name: 'Gorivo', nameEn: 'Fuel', emoji: '⛽' },
      { id: 'public_transport', name: 'Javni prijevoz', nameEn: 'Public Transport', emoji: '🚌' },
      { id: 'parking', name: 'Parking', nameEn: 'Parking', emoji: '🅿️' },
      { id: 'car_maintenance', name: 'Servis auta', nameEn: 'Car Service', emoji: '🔧' },
    ],
  },
  {
    id: 'utilities',
    name: 'Režije',
    nameEn: 'Utilities',
    emoji: '💡',
    color: '#FF9800',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'electricity', name: 'Struja', nameEn: 'Electricity', emoji: '⚡' },
      { id: 'water', name: 'Voda', nameEn: 'Water', emoji: '💧' },
      { id: 'gas', name: 'Plin', nameEn: 'Gas', emoji: '🔥' },
      { id: 'internet', name: 'Internet', nameEn: 'Internet', emoji: '🌐' },
      { id: 'phone', name: 'Mobitel', nameEn: 'Phone', emoji: '📱' },
      { id: 'taxes', name: 'Porezi i davanja', nameEn: 'Taxes & Duties', emoji: '🏛️' },
    ],
  },
  {
    id: 'health',
    name: 'Zdravlje',
    nameEn: 'Health',
    emoji: '🏥',
    color: '#4CAF50',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'doctor', name: 'Liječnik', nameEn: 'Doctor', emoji: '👨‍⚕️' },
      { id: 'pharmacy', name: 'Ljekarna', nameEn: 'Pharmacy', emoji: '💊' },
      { id: 'gym', name: 'Teretana', nameEn: 'Gym', emoji: '🏋️' },
    ],
  },
  {
    id: 'entertainment',
    name: 'Zabava',
    nameEn: 'Entertainment',
    emoji: '🎬',
    color: '#9C27B0',
    type: 'expense',
    isDefault: true,
    subcategories: [
      { id: 'movies', name: 'Kino', nameEn: 'Movies', emoji: '🎥' },
      { id: 'subscriptions', name: 'Pretplate', nameEn: 'Subscriptions', emoji: '📺' },
      { id: 'hobbies', name: 'Hobiji', nameEn: 'Hobbies', emoji: '🎨' },
      { id: 'going_out', name: 'Izlasci', nameEn: 'Going Out', emoji: '🍻' },
    ],
  },
  {
    id: 'clothing',
    name: 'Odjeća',
    nameEn: 'Clothing',
    emoji: '👕',
    color: '#E91E63',
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'education',
    name: 'Edukacija',
    nameEn: 'Education',
    emoji: '📚',
    color: '#3F51B5',
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'savings',
    name: 'Štednja',
    nameEn: 'Savings',
    emoji: '🐷',
    color: '#D4AF37',
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'debt',
    name: 'Otplata kredita',
    nameEn: 'Debt Payment',
    emoji: '🏦',
    color: '#795548',
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'personal',
    name: 'Osobno',
    nameEn: 'Personal',
    emoji: '🧴',
    color: '#00BCD4',
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'gifts',
    name: 'Pokloni',
    nameEn: 'Gifts',
    emoji: '🎁',
    color: '#F06292',
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'other_expense',
    name: 'Ostalo',
    nameEn: 'Other',
    emoji: '📌',
    color: '#607D8B',
    type: 'expense',
    isDefault: true,
  },
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  {
    id: 'salary',
    name: 'Plaća',
    nameEn: 'Salary',
    emoji: '💰',
    color: '#0F4C3A',
    type: 'income',
    isDefault: true,
  },
  {
    id: 'freelance',
    name: 'Honorar',
    nameEn: 'Freelance',
    emoji: '💻',
    color: '#2196F3',
    type: 'income',
    isDefault: true,
  },
  {
    id: 'bonus',
    name: 'Bonus',
    nameEn: 'Bonus',
    emoji: '🎉',
    color: '#D4AF37',
    type: 'income',
    isDefault: true,
  },
  {
    id: 'investment_income',
    name: 'Prihod od investicija',
    nameEn: 'Investment Income',
    emoji: '📈',
    color: '#4CAF50',
    type: 'income',
    isDefault: true,
  },
  {
    id: 'other_income',
    name: 'Ostali prihodi',
    nameEn: 'Other Income',
    emoji: '💵',
    color: '#607D8B',
    type: 'income',
    isDefault: true,
  },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
