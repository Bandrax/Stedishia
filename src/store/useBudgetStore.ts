import { create } from 'zustand';
import type { BudgetItem } from '../types';

interface BudgetState {
  budgetItems: BudgetItem[];
  currentMonth: string; // YYYY-MM
  isLoading: boolean;

  setBudgetItems: (items: BudgetItem[]) => void;
  updateBudgetItem: (id: string, updates: Partial<BudgetItem>) => void;
  addBudgetItem: (item: BudgetItem) => void;
  setCurrentMonth: (month: string) => void;
  setLoading: (loading: boolean) => void;
}

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const useBudgetStore = create<BudgetState>((set) => ({
  budgetItems: [],
  currentMonth: getCurrentMonth(),
  isLoading: false,

  setBudgetItems: (budgetItems) => set({ budgetItems }),

  updateBudgetItem: (id, updates) =>
    set((state) => ({
      budgetItems: state.budgetItems.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      ),
    })),

  addBudgetItem: (item) =>
    set((state) => ({
      budgetItems: [...state.budgetItems, item],
    })),

  setCurrentMonth: (currentMonth) => set({ currentMonth }),
  setLoading: (isLoading) => set({ isLoading }),
}));
