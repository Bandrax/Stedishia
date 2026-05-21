import * as Crypto from 'expo-crypto';
import { dbQuery, dbInsert, getDatabase } from './database';
import { getMonthlyStats } from './dashboardService';
import { getBudgetForMonth, copyBudgetFromPreviousMonth } from './budgetService';
import { getCurrentMonth } from '../utils';
import type { MonthlySnapshot } from '../types';

// Dohvati prethodni mjesec u YYYY-MM formatu
export const getPreviousMonth = (month?: string): string => {
  const m = month || getCurrentMonth();
  const [year, mon] = m.split('-').map(Number);
  const d = new Date(year, mon - 2, 1); // mon-2 jer je 1-based
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Provjeri postoji li snapshot za mjesec
const snapshotExists = async (userId: string, month: string): Promise<boolean> => {
  const rows = await dbQuery<{ id: string }>(
    'SELECT id FROM monthly_snapshots WHERE user_id = ? AND month = ?',
    [userId, month]
  );
  return rows.length > 0;
};

// Kreiraj snapshot za određeni mjesec
export const createMonthlySnapshot = async (
  userId: string,
  month: string
): Promise<MonthlySnapshot | null> => {
  // Provjeri da snapshot već ne postoji
  if (await snapshotExists(userId, month)) return null;

  // Dohvati financijske podatke za taj mjesec
  const stats = await getMonthlyStats(userId, month);

  // Stanja računa (na kraju tog mjeseca ~ trenutna stanja)
  const accounts = await dbQuery<{ name: string; type: string; balance: number }>(
    `SELECT name, type, balance FROM accounts WHERE user_id = ? AND include_in_total = 1`,
    [userId]
  );

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsTotal = accounts
    .filter((a) => a.type === 'savings')
    .reduce((sum, a) => sum + a.balance, 0);

  // Top kategorije rashoda za taj mjesec
  const topCategories = await dbQuery<{ categoryId: string; amount: number }>(
    `SELECT category_id as categoryId, SUM(amount) as amount
     FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
     GROUP BY category_id
     ORDER BY amount DESC
     LIMIT 5`,
    [userId, `${month}-01`, `${month}-31`]
  );

  // Budget performance za taj mjesec
  const budgetItems = await getBudgetForMonth(userId, month);
  const totalAllocated = budgetItems.reduce((sum, i) => sum + i.allocated, 0);
  const totalSpent = budgetItems.reduce((sum, i) => sum + i.spent, 0);
  const overBudgetCount = budgetItems.filter(
    (i) => i.allocated > 0 && i.spent > i.allocated
  ).length;

  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  const snapshot: MonthlySnapshot = {
    id,
    userId,
    month,
    totalIncome: stats.income,
    totalExpenses: stats.expenses,
    netResult: stats.income - stats.expenses,
    totalBalance,
    savingsTotal,
    accountBalances: accounts.map((a) => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
    })),
    topCategories,
    budgetPerformance: { totalAllocated, totalSpent, overBudgetCount },
    createdAt: now,
  };

  await dbInsert('monthly_snapshots', {
    id,
    user_id: userId,
    month,
    total_income: snapshot.totalIncome,
    total_expenses: snapshot.totalExpenses,
    net_result: snapshot.netResult,
    total_balance: snapshot.totalBalance,
    savings_total: snapshot.savingsTotal,
    account_balances: JSON.stringify(snapshot.accountBalances),
    top_categories: JSON.stringify(snapshot.topCategories),
    budget_performance: JSON.stringify(snapshot.budgetPerformance),
    created_at: now,
  });

  return snapshot;
};

// Dohvati snapshot za mjesec
export const getSnapshot = async (
  userId: string,
  month: string
): Promise<MonthlySnapshot | null> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM monthly_snapshots WHERE user_id = ? AND month = ?',
    [userId, month]
  );
  if (rows.length === 0) return null;
  return mapRowToSnapshot(rows[0]);
};

// Dohvati sve snapshotove (za pregled povijesti)
export const getAllSnapshots = async (
  userId: string
): Promise<MonthlySnapshot[]> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM monthly_snapshots WHERE user_id = ? ORDER BY month DESC',
    [userId]
  );
  return rows.map(mapRowToSnapshot);
};

// Pomakni zaostale recurring nextDueDates u budućnost
const advanceOverdueRecurring = async (userId: string): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const db = await getDatabase();

  // Nađi sve aktivne recurring čiji je nextDueDate u prošlosti
  const overdue = await dbQuery<{ id: string; frequency: string; next_due_date: string }>(
    `SELECT id, frequency, next_due_date FROM recurring_transactions
     WHERE user_id = ? AND is_active = 1 AND next_due_date < ?`,
    [userId, today]
  );

  let count = 0;
  for (const item of overdue) {
    let next = item.next_due_date;
    let iterations = 0;
    while (next < today && iterations < 100) {
      const d = new Date(next);
      const day = d.getDate();
      switch (item.frequency) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'biweekly': d.setDate(d.getDate() + 14); break;
        case 'monthly': {
          const nm = d.getMonth() + 1;
          const maxDay = new Date(d.getFullYear(), nm + 1, 0).getDate();
          d.setMonth(nm);
          d.setDate(Math.min(day, maxDay));
          break;
        }
        case 'quarterly': {
          const qm = d.getMonth() + 3;
          const qMax = new Date(d.getFullYear(), qm + 1, 0).getDate();
          d.setMonth(qm);
          d.setDate(Math.min(day, qMax));
          break;
        }
        case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
      }
      next = d.toISOString().split('T')[0];
      iterations++;
    }
    await db.runAsync(
      'UPDATE recurring_transactions SET next_due_date = ? WHERE id = ?',
      [next, item.id]
    );
    count++;
  }
  return count;
};

// ===== GLAVNI ENTRY POINT =====
// Poziva se na app startu. Osigurava da je prijelaz mjeseca obrađen.

export interface MonthTransitionResult {
  snapshotCreated: boolean;
  snapshot: MonthlySnapshot | null;
  budgetCopied: boolean;
  budgetItemsCopied: number;
  recurringAdvanced: number;
}

export const ensureMonthTransition = async (
  userId: string
): Promise<MonthTransitionResult> => {
  const currentMonth = getCurrentMonth();
  const prevMonth = getPreviousMonth(currentMonth);

  const result: MonthTransitionResult = {
    snapshotCreated: false,
    snapshot: null,
    budgetCopied: false,
    budgetItemsCopied: 0,
    recurringAdvanced: 0,
  };

  // 1. Kreiraj snapshot prošlog mjeseca (ako ne postoji)
  const snapshot = await createMonthlySnapshot(userId, prevMonth);
  if (snapshot) {
    result.snapshotCreated = true;
    result.snapshot = snapshot;
  } else {
    // Dohvati postojeći snapshot
    result.snapshot = await getSnapshot(userId, prevMonth);
  }

  // 2. Kopiraj budget alokacije u novi mjesec (ako nema)
  const currentBudget = await getBudgetForMonth(userId, currentMonth);
  if (currentBudget.length === 0) {
    const prevBudget = await getBudgetForMonth(userId, prevMonth);
    if (prevBudget.length > 0) {
      const count = await copyBudgetFromPreviousMonth(userId, currentMonth);
      result.budgetCopied = true;
      result.budgetItemsCopied = count;
    }
  }

  // 3. Pomakni zaostale recurring plaćanja
  result.recurringAdvanced = await advanceOverdueRecurring(userId);

  return result;
};

// Helper: map DB row to MonthlySnapshot
const mapRowToSnapshot = (row: any): MonthlySnapshot => ({
  id: row.id,
  userId: row.user_id,
  month: row.month,
  totalIncome: row.total_income,
  totalExpenses: row.total_expenses,
  netResult: row.net_result,
  totalBalance: row.total_balance,
  savingsTotal: row.savings_total,
  accountBalances: JSON.parse(row.account_balances || '[]'),
  topCategories: JSON.parse(row.top_categories || '[]'),
  budgetPerformance: JSON.parse(row.budget_performance || '{}'),
  createdAt: row.created_at,
});
