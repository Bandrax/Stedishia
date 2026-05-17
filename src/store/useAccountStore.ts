import { create } from 'zustand';
import type { Account } from '../types';

interface AccountState {
  accounts: Account[];
  isLoading: boolean;

  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getTotalBalance: () => number;
  setLoading: (loading: boolean) => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,

  setAccounts: (accounts) => set({ accounts }),

  addAccount: (account) =>
    set((state) => ({ accounts: [...state.accounts, account] })),

  updateAccount: (id, updates) =>
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    })),

  deleteAccount: (id) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    })),

  getTotalBalance: () => {
    return get()
      .accounts.filter((a) => a.includeInTotal)
      .reduce((sum, a) => sum + a.balance, 0);
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
