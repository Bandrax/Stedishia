// ===== Korisnik / Profil =====
export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  pin?: string; // hashed
  biometricEnabled: boolean;
  monthlyIncome: number;
  currency: string;
  householdId: string;
  budgetMode: 'envelope' | '50-30-20';
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  id: string;
  name: string;
  members: string[]; // user IDs
  createdAt: string;
}

// ===== Računi (Accounts) =====
export type AccountType = 'checking' | 'savings' | 'cash' | 'credit_card';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  isDefault: boolean;
  includeInTotal: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== Transakcije =====
export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionScope = 'personal' | 'shared';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  scope: TransactionScope;
  amount: number;
  currency: string;
  categoryId: string;
  subcategoryId?: string;
  description: string;
  note?: string;
  date: string;
  tags: string[];
  isRecurring: boolean;
  recurringId?: string;
  splitParts?: SplitPart[];
  location?: TransactionLocation;
  createdAt: string;
  updatedAt: string;
}

export interface SplitPart {
  categoryId: string;
  amount: number;
  note?: string;
}

export interface TransactionLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

// ===== Ponavljajuće transakcije =====
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  scope: TransactionScope;
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  description: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  isActive: boolean;
  autoAdd: boolean;
  reminderDaysBefore: number;
  createdAt: string;
}

// ===== Budget =====
export interface BudgetItem {
  id: string;
  userId: string;
  categoryId: string;
  month: string; // YYYY-MM format
  allocated: number;
  spent: number;
  scope: TransactionScope;
  createdAt: string;
  updatedAt: string;
}

// ===== Ciljevi =====
export type GoalStatus = 'active' | 'completed' | 'paused';

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  status: GoalStatus;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Krediti / Obveze =====
export interface Debt {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: string; // dan u mjesecu
  startDate: string;
  endDate?: string;
  type: 'mortgage' | 'personal_loan' | 'car_loan' | 'credit_card' | 'other';
  createdAt: string;
  updatedAt: string;
}

// ===== AI Savjeti =====
export type AdvicePriority = 'high' | 'medium' | 'low';
export type AdviceCategory = 'spending' | 'saving' | 'budget' | 'goal' | 'subscription' | 'general';

export interface FinancialAdvice {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: AdviceCategory;
  priority: AdvicePriority;
  isRead: boolean;
  isDismissed: boolean;
  scope: 'personal' | 'household';
  actionLabel?: string;
  actionRoute?: string;
  createdAt: string;
}

// ===== Postavke =====
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'hr' | 'en';
  currency: string;
  autoLockMinutes: number;
  notificationsEnabled: boolean;
  weeklyCheckInEnabled: boolean;
  weeklyCheckInDay: number; // 0-6, 0 = nedjelja
}

// ===== Sync =====
export interface SyncData {
  version: number;
  userId: string;
  householdId: string;
  exportedAt: string;
  transactions: Transaction[];
  accounts: Account[];
  budgetItems: BudgetItem[];
  goals: SavingsGoal[];
  debts: Debt[];
  recurringTransactions: RecurringTransaction[];
}

// ===== Navigacija =====
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  TransactionDetail: { transactionId: string };
  AddTransaction: { type?: TransactionType };
  EditTransaction: { transactionId: string };
  CategoryDetail: { categoryId: string; month: string };
  GoalDetail: { goalId: string };
  DebtDetail: { debtId: string };
  Settings: undefined;
  AccountDetail: { accountId: string };
  AddAccount: undefined;
  BudgetSetup: { month: string };
  Reports: undefined;
  Accounts: undefined;
  Advisor: undefined;
  Household: undefined;
  RecurringPayments: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Budget: undefined;
  Goals: undefined;
  More: undefined;
};
