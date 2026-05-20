import { dbQuery } from './database';
import { getCurrentMonth } from '../utils';
import { ALL_DEFAULT_CATEGORIES } from '../constants';
import i18n from '../locales/i18n';

// Dohvati ukupno stanje svih računa za korisnika
export const getTotalBalance = async (userId: string): Promise<number> => {
  const result = await dbQuery<{ total: number }>(
    'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND include_in_total = 1',
    [userId]
  );
  return result[0]?.total ?? 0;
};

// Dohvati prihode i rashode za mjesec
export const getMonthlyStats = async (
  userId: string,
  month?: string
): Promise<{ income: number; expenses: number }> => {
  const m = month || getCurrentMonth();
  const startDate = `${m}-01`;
  const endDate = `${m}-31`;

  const incomeResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?`,
    [userId, startDate, endDate]
  );

  const expenseResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
    [userId, startDate, endDate]
  );

  return {
    income: incomeResult[0]?.total ?? 0,
    expenses: expenseResult[0]?.total ?? 0,
  };
};

// Top 3 troška ovog mjeseca po kategoriji
export const getTopExpenses = async (
  userId: string,
  month?: string,
  limit: number = 3
): Promise<Array<{ category_id: string; total: number }>> => {
  const m = month || getCurrentMonth();
  const startDate = `${m}-01`;
  const endDate = `${m}-31`;

  return dbQuery<{ category_id: string; total: number }>(
    `SELECT category_id, SUM(amount) as total FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
     GROUP BY category_id
     ORDER BY total DESC
     LIMIT ?`,
    [userId, startDate, endDate, limit]
  );
};

// Predstojeća plaćanja (recurring transakcije)
export const getUpcomingPayments = async (
  userId: string,
  daysAhead: number = 7
): Promise<Array<{
  id: string;
  description: string;
  amount: number;
  next_due_date: string;
  category_id: string;
}>> => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  return dbQuery(
    `SELECT id, description, amount, next_due_date, category_id
     FROM recurring_transactions
     WHERE user_id = ? AND is_active = 1 AND next_due_date >= ? AND next_due_date <= ?
     ORDER BY next_due_date ASC`,
    [userId, today, futureDateStr]
  );
};

// Budget progress po kategorijama za mjesec
export const getBudgetProgress = async (
  userId: string,
  month?: string
): Promise<Array<{
  category_id: string;
  allocated: number;
  spent: number;
}>> => {
  const m = month || getCurrentMonth();

  return dbQuery(
    `SELECT bi.category_id, bi.allocated,
       COALESCE((
         SELECT SUM(t.amount) FROM transactions t
         WHERE t.user_id = bi.user_id AND t.category_id = bi.category_id
         AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
       ), 0) as spent
     FROM budget_items bi
     WHERE bi.user_id = ? AND bi.month = ?
     ORDER BY bi.allocated DESC`,
    [`${m}-01`, `${m}-31`, userId, m]
  );
};

// Dnevni saldo za cash-flow graf (zadnjih N dana)
export const getDailyCashFlow = async (
  userId: string,
  days: number = 30
): Promise<number[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const transactions = await dbQuery<{ date: string; type: string; amount: number }>(
    `SELECT date, type, amount FROM transactions
     WHERE user_id = ? AND type IN ('income', 'expense') AND date >= ? AND date <= ?
     ORDER BY date ASC`,
    [
      userId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]
  );

  // Izračunaj kumulativni saldo po danu (transferi isključeni - ne utječu na neto)
  const dailyMap = new Map<string, number>();
  for (const tx of transactions) {
    const current = dailyMap.get(tx.date) || 0;
    dailyMap.set(
      tx.date,
      current + (tx.type === 'income' ? tx.amount : -tx.amount)
    );
  }

  // Popuni sve dane
  const result: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    cumulative += dailyMap.get(dateStr) || 0;
    result.push(cumulative);
  }

  return result;
};

// Promjena u odnosu na prošli mjesec (%)
export const getMonthlyChangePercent = async (
  userId: string
): Promise<number> => {
  const now = new Date();
  const currentMonth = getCurrentMonth();

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const current = await getMonthlyStats(userId, currentMonth);
  const prev = await getMonthlyStats(userId, prevMonth);

  const currentNet = current.income - current.expenses;
  const prevNet = prev.income - prev.expenses;

  if (prevNet === 0) return 0;
  return ((currentNet - prevNet) / Math.abs(prevNet)) * 100;
};

// Dohvati podatke o štednji: ukupno stanje savings računa + koliko je prebačeno ovaj mjesec
export const getSavingsStats = async (
  userId: string,
  month?: string
): Promise<{ savingsBalance: number; monthlyTransfers: number }> => {
  // Ukupno stanje svih savings računa
  const balResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(balance), 0) as total FROM accounts
     WHERE user_id = ? AND type = 'savings'`,
    [userId]
  );

  // Transferi na savings račune ovaj mjesec
  const m = month || getCurrentMonth();
  const startDate = `${m}-01`;
  const endDate = `${m}-31`;

  const txResult = await dbQuery<{ total: number }>(
    `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
     INNER JOIN accounts a ON t.to_account_id = a.id
     WHERE t.user_id = ? AND t.type = 'transfer' AND a.type = 'savings'
     AND t.date >= ? AND t.date <= ?`,
    [userId, startDate, endDate]
  );

  return {
    savingsBalance: balResult[0]?.total ?? 0,
    monthlyTransfers: txResult[0]?.total ?? 0,
  };
};

// Lookup kategorije po ID-u
export const getCategoryInfo = (categoryId: string) => {
  const cat = ALL_DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return undefined;
  const isEn = i18n.language === 'en';
  return {
    ...cat,
    name: isEn ? cat.nameEn : cat.name,
    subcategories: cat.subcategories?.map((s) => ({
      ...s,
      name: isEn ? s.nameEn : s.name,
    })),
  };
};
