import * as Crypto from 'expo-crypto';
import { dbInsert, dbUpdate, dbQuery, getDatabase } from './database';
import { getCurrentMonth } from '../utils';
import { DEFAULT_EXPENSE_CATEGORIES } from '../constants';
import type { BudgetItem } from '../types';

// Dohvati budžet za mjesec
export const getBudgetForMonth = async (
  userId: string,
  month?: string
): Promise<BudgetItem[]> => {
  const m = month || getCurrentMonth();

  const rows = await dbQuery<any>(
    `SELECT bi.*,
       COALESCE((
         SELECT SUM(t.amount) FROM transactions t
         WHERE t.user_id = bi.user_id AND t.category_id = bi.category_id
         AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
       ), 0) as actual_spent
     FROM budget_items bi
     WHERE bi.user_id = ? AND bi.month = ?
     ORDER BY bi.allocated DESC`,
    [`${m}-01`, `${m}-31`, userId, m]
  );

  return rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    month: row.month,
    allocated: row.allocated,
    spent: row.actual_spent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

// Kreiraj ili ažuriraj budžet stavku
export const upsertBudgetItem = async (
  userId: string,
  categoryId: string,
  month: string,
  allocated: number
): Promise<string> => {
  const now = new Date().toISOString();
  const db = await getDatabase();

  // Provjeri postoji li već
  const existing = await dbQuery<any>(
    'SELECT id FROM budget_items WHERE user_id = ? AND category_id = ? AND month = ?',
    [userId, categoryId, month]
  );

  if (existing.length > 0) {
    await dbUpdate('budget_items', existing[0].id, {
      allocated,
      updated_at: now,
    });
    return existing[0].id;
  } else {
    const id = Crypto.randomUUID();
    await dbInsert('budget_items', {
      id,
      user_id: userId,
      category_id: categoryId,
      month,
      allocated,
      spent: 0,
      created_at: now,
      updated_at: now,
    });
    return id;
  }
};

// Kopiraj budžet iz prošlog mjeseca
export const copyBudgetFromPreviousMonth = async (
  userId: string,
  targetMonth: string
): Promise<number> => {
  const [year, monthNum] = targetMonth.split('-').map(Number);
  const prevDate = new Date(year, monthNum - 2); // -2 jer je monthNum 1-based
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const prevBudget = await getBudgetForMonth(userId, prevMonth);
  let count = 0;

  for (const item of prevBudget) {
    await upsertBudgetItem(userId, item.categoryId, targetMonth, item.allocated);
    count++;
  }

  return count;
};

// Preporučeni postoci prema financijskim stručnjacima (Elizabeth Warren 50/30/20,
// NerdWallet, Ramsey Solutions). Svaka kategorija ima težinski udio unutar svoje grupe.
// Postoci su od UKUPNOG prihoda.
const RECOMMENDED_PERCENTAGES: Record<string, number> = {
  // Potrebe (50%)
  housing:       0.27,  // 27% — najam/kredit + namještaj + održavanje
  food:          0.13,  // 13% — namirnice + restorani
  transport:     0.05,  // 5%  — gorivo, javni prijevoz
  utilities:     0.03,  // 3%  — struja, voda, internet
  health:        0.02,  // 2%  — lijekovi, pregledi
  // Želje (30%)
  entertainment: 0.10,  // 10% — kino, izlasci, hobi
  clothing:      0.05,  // 5%  — odjeća, obuća
  personal:      0.05,  // 5%  — njega, kozmetika
  education:     0.05,  // 5%  — tečajevi, knjige
  gifts:         0.05,  // 5%  — pokloni, donacije
  // Ušteđevina (20%)
  savings:       0.10,  // 10% — štednja, hitni fond
  debt:          0.10,  // 10% — otplata dugova
  // UKUPNO: 100%
};

// Generiraj 50/30/20 budžet s preporučenim postocima
export const generate503020Budget = async (
  userId: string,
  monthlyIncome: number,
  month?: string
): Promise<BudgetItem[]> => {
  const m = month || getCurrentMonth();

  for (const [catId, pct] of Object.entries(RECOMMENDED_PERCENTAGES)) {
    const allocated = Math.round(monthlyIncome * pct);
    await upsertBudgetItem(userId, catId, m, allocated);
  }

  return getBudgetForMonth(userId, m);
};

// Izračunaj ukupno raspoređeno, potrošeno, preostalo
export interface BudgetSummary {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  availableToAllocate: number;
  items: BudgetItem[];
  overBudgetCategories: string[];
  nearLimitCategories: string[]; // > 80%
}

export const getBudgetSummary = async (
  userId: string,
  monthlyIncome: number,
  month?: string
): Promise<BudgetSummary> => {
  const items = await getBudgetForMonth(userId, month);

  const totalAllocated = items.reduce((sum, i) => sum + i.allocated, 0);
  const totalSpent = items.reduce((sum, i) => sum + i.spent, 0);

  const overBudgetCategories = items
    .filter((i) => i.allocated > 0 && i.spent > i.allocated)
    .map((i) => i.categoryId);

  const nearLimitCategories = items
    .filter((i) => i.allocated > 0 && i.spent / i.allocated > 0.8 && i.spent <= i.allocated)
    .map((i) => i.categoryId);

  return {
    totalIncome: monthlyIncome,
    totalAllocated,
    totalSpent,
    availableToAllocate: monthlyIncome - totalAllocated,
    items,
    overBudgetCategories,
    nearLimitCategories,
  };
};

// Dohvati potrošnju bez budžeta (kategorije koje imaju troškove ali nemaju budžet)
export const getUnbudgetedSpending = async (
  userId: string,
  month?: string
): Promise<Array<{ categoryId: string; spent: number }>> => {
  const m = month || getCurrentMonth();

  return dbQuery<{ categoryId: string; spent: number }>(
    `SELECT t.category_id as categoryId, SUM(t.amount) as spent
     FROM transactions t
     WHERE t.user_id = ? AND t.type = 'expense'
     AND t.date >= ? AND t.date <= ?
     AND t.category_id NOT IN (
       SELECT bi.category_id FROM budget_items bi
       WHERE bi.user_id = ? AND bi.month = ?
     )
     GROUP BY t.category_id
     ORDER BY spent DESC`,
    [userId, `${m}-01`, `${m}-31`, userId, m]
  );
};
