import { dbQuery } from './database';
import { getCurrentMonth } from '../utils';

// Mjesečni pregled: prihodi, rashodi, neto, stvarna štednja po mjesecima
export const getMonthlyOverview = async (
  userId: string,
  months: number = 12
): Promise<Array<{
  month: string;
  income: number;
  expenses: number;
  savings: number;
  actualSavings: number; // stvarni transferi na savings račune
}>> => {
  const now = new Date();
  const results: Array<{ month: string; income: number; expenses: number; savings: number; actualSavings: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

    // Stvarna štednja: transferi na savings račune ovaj mjesec
    const savingsResult = await dbQuery<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
       INNER JOIN accounts a ON t.to_account_id = a.id
       WHERE t.user_id = ? AND t.type = 'transfer' AND a.type = 'savings'
       AND t.date >= ? AND t.date <= ?`,
      [userId, startDate, endDate]
    );

    const income = incomeResult[0]?.total ?? 0;
    const expenses = expenseResult[0]?.total ?? 0;
    const actualSavings = savingsResult[0]?.total ?? 0;

    results.push({
      month: m,
      income,
      expenses,
      savings: income - expenses,
      actualSavings,
    });
  }

  return results;
};

// Raščlamba prihoda po kategoriji za zadnjih N mjeseci
export const getIncomeBreakdown = async (
  userId: string,
  months: number = 6
): Promise<Array<{ categoryId: string; total: number; percentage: number }>> => {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1);
  const startDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

  const rows = await dbQuery<{ category_id: string; total: number }>(
    `SELECT category_id, COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?
     GROUP BY category_id ORDER BY total DESC`,
    [userId, startDate, endDate]
  );

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  return rows.map((r) => ({
    categoryId: r.category_id,
    total: r.total,
    percentage: grandTotal > 0 ? (r.total / grandTotal) * 100 : 0,
  }));
};

// Trendovi po kategorijama - zadnjih N mjeseci
export const getCategoryTrends = async (
  userId: string,
  months: number = 6
): Promise<Array<{
  categoryId: string;
  months: Array<{ month: string; amount: number }>;
  total: number;
  average: number;
  trend: number; // % promjena zadnji vs predzadnji mjesec
}>> => {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1);
  const startDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = `${getCurrentMonth()}-31`;

  const rows = await dbQuery<{ category_id: string; month: string; total: number }>(
    `SELECT category_id, strftime('%Y-%m', date) as month, SUM(amount) as total
     FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
     GROUP BY category_id, month
     ORDER BY category_id, month`,
    [userId, startDate, endDate]
  );

  // Grupiraj po kategoriji
  const categoryMap = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!categoryMap.has(row.category_id)) {
      categoryMap.set(row.category_id, new Map());
    }
    categoryMap.get(row.category_id)!.set(row.month, row.total);
  }

  const results: Array<{
    categoryId: string;
    months: Array<{ month: string; amount: number }>;
    total: number;
    average: number;
    trend: number;
  }> = [];

  for (const [categoryId, monthMap] of categoryMap) {
    const monthData: Array<{ month: string; amount: number }> = [];
    let total = 0;

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amount = monthMap.get(m) || 0;
      monthData.push({ month: m, amount });
      total += amount;
    }

    const average = total / months;
    const lastMonth = monthData[monthData.length - 1]?.amount ?? 0;
    const prevMonth = monthData[monthData.length - 2]?.amount ?? 0;
    const trend = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

    results.push({ categoryId, months: monthData, total, average, trend });
  }

  // Sortiraj po ukupnom trošku
  results.sort((a, b) => b.total - a.total);
  return results;
};

// Cash flow forecast - procjena za sljedećih N dana
export const getCashFlowForecast = async (
  userId: string,
  daysAhead: number = 90
): Promise<{
  currentBalance: number;
  projectedBalance: number;
  dailyData: Array<{ date: string; balance: number; isProjection: boolean }>;
  avgDailyIncome: number;
  avgDailyExpense: number;
}> => {
  // Dohvati trenutni saldo
  const balanceResult = await dbQuery<{ total: number }>(
    'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND include_in_total = 1',
    [userId]
  );
  const currentBalance = balanceResult[0]?.total ?? 0;

  // Prosječni dnevni prihodi i rashodi iz zadnjih 90 dana
  const pastDays = 90;
  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - pastDays);

  const pastStats = await dbQuery<{ type: string; total: number }>(
    `SELECT type, SUM(amount) as total FROM transactions
     WHERE user_id = ? AND date >= ? AND type IN ('income', 'expense')
     GROUP BY type`,
    [userId, pastStart.toISOString().split('T')[0]]
  );

  let totalIncome = 0;
  let totalExpense = 0;
  for (const s of pastStats) {
    if (s.type === 'income') totalIncome = s.total;
    if (s.type === 'expense') totalExpense = s.total;
  }

  const avgDailyIncome = totalIncome / pastDays;
  const avgDailyExpense = totalExpense / pastDays;
  const avgDailyNet = avgDailyIncome - avgDailyExpense;

  // Recurring transakcije koje dolaze
  const recurringPayments = await dbQuery<{ amount: number; next_due_date: string; type: string }>(
    `SELECT amount, next_due_date, 'expense' as type FROM recurring_transactions
     WHERE user_id = ? AND is_active = 1
     ORDER BY next_due_date ASC`,
    [userId]
  );

  // Generiraj projekciju
  const dailyData: Array<{ date: string; balance: number; isProjection: boolean }> = [];
  const today = new Date();

  // Prošlih 30 dana stvarnih podataka (bez transfera — ne utječu na neto)
  const historicalTransactions = await dbQuery<{ date: string; type: string; amount: number }>(
    `SELECT date, type, amount FROM transactions
     WHERE user_id = ? AND type IN ('income', 'expense') AND date >= ?
     ORDER BY date ASC`,
    [userId, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30).toISOString().split('T')[0]]
  );

  // Kumuliraj prošle dane
  const histMap = new Map<string, number>();
  for (const tx of historicalTransactions) {
    const curr = histMap.get(tx.date) || 0;
    histMap.set(tx.date, curr + (tx.type === 'income' ? tx.amount : -tx.amount));
  }

  let balance = currentBalance;
  // Izračunaj retroaktivno za 30 dana unatrag
  const histDays: Array<{ date: string; net: number }> = [];
  for (let i = 30; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    histDays.push({ date: dateStr, net: histMap.get(dateStr) || 0 });
  }

  // Izračunaj saldo za 30 dana unatrag
  let histBalance = currentBalance;
  for (let i = histDays.length - 1; i >= 0; i--) {
    histBalance -= histDays[i].net;
  }
  for (const hd of histDays) {
    histBalance += hd.net;
    dailyData.push({ date: hd.date, balance: histBalance, isProjection: false });
  }

  // Danas
  dailyData.push({ date: today.toISOString().split('T')[0], balance: currentBalance, isProjection: false });

  // Projekcija unaprijed
  let projBalance = currentBalance;
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    projBalance += avgDailyNet;

    // Dodaj recurring plaćanja ako padaju na ovaj dan
    for (const rp of recurringPayments) {
      if (rp.next_due_date === dateStr) {
        projBalance -= rp.amount;
      }
    }

    dailyData.push({ date: dateStr, balance: projBalance, isProjection: true });
  }

  return {
    currentBalance,
    projectedBalance: projBalance,
    dailyData,
    avgDailyIncome,
    avgDailyExpense,
  };
};

// Godišnji pregled
export const getYearlyOverview = async (
  userId: string,
  year?: number
): Promise<{
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  savingsRate: number;
  monthlyData: Array<{ month: string; income: number; expenses: number }>;
  topCategories: Array<{ categoryId: string; total: number; percentage: number }>;
}> => {
  const y = year || new Date().getFullYear();
  const startDate = `${y}-01-01`;
  const endDate = `${y}-12-31`;

  // Ukupni prihodi i rashodi
  const totals = await dbQuery<{ type: string; total: number }>(
    `SELECT type, SUM(amount) as total FROM transactions
     WHERE user_id = ? AND date >= ? AND date <= ? AND type IN ('income', 'expense')
     GROUP BY type`,
    [userId, startDate, endDate]
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const t of totals) {
    if (t.type === 'income') totalIncome = t.total;
    if (t.type === 'expense') totalExpenses = t.total;
  }

  const totalSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // Mjesečni breakdown
  const monthlyRows = await dbQuery<{ month: string; type: string; total: number }>(
    `SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
     FROM transactions
     WHERE user_id = ? AND date >= ? AND date <= ?
     GROUP BY month, type
     ORDER BY month`,
    [userId, startDate, endDate]
  );

  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  for (let m = 1; m <= 12; m++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    monthlyMap.set(key, { income: 0, expenses: 0 });
  }
  for (const row of monthlyRows) {
    const entry = monthlyMap.get(row.month);
    if (entry) {
      if (row.type === 'income') entry.income = row.total;
      if (row.type === 'expense') entry.expenses = row.total;
    }
  }

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  // Top kategorije rashoda
  const catRows = await dbQuery<{ category_id: string; total: number }>(
    `SELECT category_id, SUM(amount) as total FROM transactions
     WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
     GROUP BY category_id
     ORDER BY total DESC
     LIMIT 10`,
    [userId, startDate, endDate]
  );

  const topCategories = catRows.map((r) => ({
    categoryId: r.category_id,
    total: r.total,
    percentage: totalExpenses > 0 ? (r.total / totalExpenses) * 100 : 0,
  }));

  return {
    year: y,
    totalIncome,
    totalExpenses,
    totalSavings,
    savingsRate,
    monthlyData,
    topCategories,
  };
};

// Usporedba dva mjeseca
export const compareMonths = async (
  userId: string,
  month1: string,
  month2: string
): Promise<{
  month1: { month: string; income: number; expenses: number };
  month2: { month: string; income: number; expenses: number };
  incomeDiff: number;
  expensesDiff: number;
  incomeChange: number;
  expensesChange: number;
}> => {
  const getStats = async (m: string) => {
    const start = `${m}-01`;
    const end = `${m}-31`;
    const inc = await dbQuery<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?`,
      [userId, start, end]
    );
    const exp = await dbQuery<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
      [userId, start, end]
    );
    return { month: m, income: inc[0]?.total ?? 0, expenses: exp[0]?.total ?? 0 };
  };

  const m1 = await getStats(month1);
  const m2 = await getStats(month2);

  return {
    month1: m1,
    month2: m2,
    incomeDiff: m2.income - m1.income,
    expensesDiff: m2.expenses - m1.expenses,
    incomeChange: m1.income > 0 ? ((m2.income - m1.income) / m1.income) * 100 : 0,
    expensesChange: m1.expenses > 0 ? ((m2.expenses - m1.expenses) / m1.expenses) * 100 : 0,
  };
};
