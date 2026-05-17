import { create } from 'zustand';
import type { SavingsGoal } from '../types';

interface GoalState {
  goals: SavingsGoal[];
  isLoading: boolean;

  setGoals: (goals: SavingsGoal[]) => void;
  addGoal: (goal: SavingsGoal) => void;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useGoalStore = create<GoalState>((set) => ({
  goals: [],
  isLoading: false,

  setGoals: (goals) => set({ goals }),

  addGoal: (goal) =>
    set((state) => ({ goals: [...state.goals, goal] })),

  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      ),
    })),

  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    })),

  setLoading: (isLoading) => set({ isLoading }),
}));
