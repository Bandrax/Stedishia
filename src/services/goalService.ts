import * as Crypto from 'expo-crypto';
import { dbInsert, dbUpdate, dbDelete, dbQuery } from './database';
import type { SavingsGoal, GoalStatus } from '../types';

// Kreiraj novi cilj
export const createGoal = async (
  goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  await dbInsert('savings_goals', {
    id,
    user_id: goal.userId,
    name: goal.name,
    emoji: goal.emoji,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    target_date: goal.targetDate,
    monthly_contribution: goal.monthlyContribution,
    status: goal.status,
    color: goal.color,
    created_at: now,
    updated_at: now,
  });

  return id;
};

// Dohvati sve ciljeve za korisnika
export const getGoals = async (userId: string): Promise<SavingsGoal[]> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM savings_goals WHERE user_id = ? ORDER BY status ASC, target_date ASC',
    [userId]
  );

  return rows.map(mapRowToGoal);
};

// Ažuriraj cilj
export const updateGoal = async (
  id: string,
  updates: Partial<SavingsGoal>
): Promise<void> => {
  const now = new Date().toISOString();
  const dbUpdates: Record<string, unknown> = { updated_at: now };

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
  if (updates.targetAmount !== undefined) dbUpdates.target_amount = updates.targetAmount;
  if (updates.currentAmount !== undefined) dbUpdates.current_amount = updates.currentAmount;
  if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;
  if (updates.monthlyContribution !== undefined) dbUpdates.monthly_contribution = updates.monthlyContribution;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  await dbUpdate('savings_goals', id, dbUpdates);
};

// Dodaj iznos cilju
export const addToGoal = async (id: string, amount: number): Promise<SavingsGoal | null> => {
  const rows = await dbQuery<any>('SELECT * FROM savings_goals WHERE id = ?', [id]);
  if (rows.length === 0) return null;

  const goal = mapRowToGoal(rows[0]);
  const newAmount = goal.currentAmount + amount;
  const newStatus: GoalStatus = newAmount >= goal.targetAmount ? 'completed' : goal.status;

  await updateGoal(id, {
    currentAmount: newAmount,
    status: newStatus,
  });

  return { ...goal, currentAmount: newAmount, status: newStatus };
};

// Obriši cilj
export const deleteGoalById = async (id: string): Promise<void> => {
  await dbDelete('savings_goals', id);
};

// Izračunaj koliko mjeseci treba za cilj
export const calculateMonthsToGoal = (
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number
): number => {
  if (monthlyContribution <= 0) return Infinity;
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthlyContribution);
};

// Izračunaj potrebnu mjesečnu štednju za cilj do datuma
export const calculateMonthlyNeeded = (
  targetAmount: number,
  currentAmount: number,
  targetDate: string
): number => {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;

  const now = new Date();
  const target = new Date(targetDate);
  const monthsDiff =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());

  if (monthsDiff <= 0) return remaining;
  return Math.ceil(remaining / monthsDiff);
};

// Neto vrijednost (ukupna imovina - ukupni dugovi)
export const getNetWorth = async (userId: string): Promise<{
  assets: number;
  liabilities: number;
  netWorth: number;
}> => {
  // Imovina = suma svih računa (osim kreditnih kartica s negativnim stanjem)
  const assetResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(balance), 0) as total FROM accounts
     WHERE user_id = ? AND include_in_total = 1 AND type != 'credit_card'`,
    [userId]
  );

  // Uključi pozitivna stanja kreditnih kartica
  const ccResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as total
     FROM accounts WHERE user_id = ? AND type = 'credit_card'`,
    [userId]
  );

  // Dugovi = suma negativnih stanja + dugovi iz tablice debts
  const ccDebtResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END), 0) as total
     FROM accounts WHERE user_id = ? AND type = 'credit_card'`,
    [userId]
  );

  const debtResult = await dbQuery<{ total: number }>(
    'SELECT COALESCE(SUM(remaining_amount), 0) as total FROM debts WHERE user_id = ?',
    [userId]
  );

  // Ciljevi štednje kao dio imovine
  const goalsResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(current_amount), 0) as total FROM savings_goals
     WHERE user_id = ? AND status != 'completed'`,
    [userId]
  );

  const assets = (assetResult[0]?.total ?? 0) + (ccResult[0]?.total ?? 0) + (goalsResult[0]?.total ?? 0);
  const liabilities = (ccDebtResult[0]?.total ?? 0) + (debtResult[0]?.total ?? 0);

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
};

// Izračunaj koliko mjeseci pokriva sigurnosni fond
export const getEmergencyFundCoverage = async (
  userId: string,
  monthlyExpenses: number
): Promise<number> => {
  // Sigurnosni fond = štedni računi + cilj "emergencyFund" ako postoji
  const savingsResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(balance), 0) as total FROM accounts
     WHERE user_id = ? AND type = 'savings'`,
    [userId]
  );

  const total = savingsResult[0]?.total ?? 0;
  if (monthlyExpenses <= 0) return 0;
  return total / monthlyExpenses;
};

const mapRowToGoal = (row: any): SavingsGoal => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  emoji: row.emoji,
  targetAmount: row.target_amount,
  currentAmount: row.current_amount,
  targetDate: row.target_date,
  monthlyContribution: row.monthly_contribution,
  status: row.status,
  color: row.color,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
