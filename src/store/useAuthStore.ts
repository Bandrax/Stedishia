import { create } from 'zustand';
import type { UserProfile, Household } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  currentUser: UserProfile | null;
  household: Household | null;

  setAuthenticated: (value: boolean) => void;
  setOnboarded: (value: boolean) => void;
  setCurrentUser: (user: UserProfile | null) => void;
  setHousehold: (household: Household | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isOnboarded: false,
  currentUser: null,
  household: null,

  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setHousehold: (household) => set({ household }),
  logout: () => set({ isAuthenticated: false, currentUser: null }),
}));
