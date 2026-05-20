import * as Crypto from 'expo-crypto';
import { dbInsert, dbUpdate, dbDelete, dbQuery } from './database';
import { createTransaction } from './transactionService';
import { getCurrentCurrency } from '../store/useSettingsStore';
import type { RecurringTransaction } from '../types';

// ===== Helpers =====

export const isPaidThisMonth = (tx: RecurringTransaction): boolean => {
  if (!tx.lastPaidDate) return false;
  const now = new Date();
  const paid = new Date(tx.lastPaidDate);
  return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth();
};

export const advanceNextDueDate = (
  frequency: RecurringTransaction['frequency'],
  currentNextDueDate: string
): string => {
  const date = new Date(currentNextDueDate);
  const day = date.getDate();

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly': {
      const nextMonth = date.getMonth() + 1;
      const nextYear = date.getFullYear();
      const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate();
      date.setMonth(nextMonth);
      date.setDate(Math.min(day, maxDay));
      break;
    }
    case 'quarterly': {
      const qMonth = date.getMonth() + 3;
      const qYear = date.getFullYear();
      const qMaxDay = new Date(qYear, qMonth + 1, 0).getDate();
      date.setMonth(qMonth);
      date.setDate(Math.min(day, qMaxDay));
      break;
    }
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
};

// Advance until nextDueDate is in the future (handles missed months)
const advanceToFuture = (
  frequency: RecurringTransaction['frequency'],
  currentNextDueDate: string
): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = currentNextDueDate;
  let iterations = 0;
  while (new Date(next).getTime() <= today.getTime() && iterations < 100) {
    next = advanceNextDueDate(frequency, next);
    iterations++;
  }
  return next;
};

// ===== CRUD =====

export const createRecurring = async (
  tx: Omit<RecurringTransaction, 'id' | 'createdAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  const record: Record<string, unknown> = {
    id,
    user_id: tx.userId,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    category_id: tx.categoryId,
    subcategory_id: tx.subcategoryId || null,
    frequency: tx.frequency,
    start_date: now,
    next_due_date: tx.nextDueDate,
    is_active: tx.isActive ? 1 : 0,
    created_at: now,
  };
  if (tx.accountId && tx.accountId !== 'none') {
    record.account_id = tx.accountId;
  }

  await dbInsert('recurring_transactions', record);
  return id;
};

export const getRecurringTransactions = async (
  userId: string
): Promise<RecurringTransaction[]> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM recurring_transactions WHERE user_id = ? ORDER BY next_due_date ASC',
    [userId]
  );
  return rows.map(mapRow);
};

export const getRecurringById = async (
  id: string
): Promise<RecurringTransaction | null> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM recurring_transactions WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
};

export const updateRecurring = async (
  id: string,
  updates: Partial<RecurringTransaction>
): Promise<void> => {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
  if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId;
  if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  if (updates.nextDueDate !== undefined) dbUpdates.next_due_date = updates.nextDueDate;
  if (updates.lastPaidDate !== undefined) dbUpdates.last_paid_date = updates.lastPaidDate;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive ? 1 : 0;

  if (Object.keys(dbUpdates).length > 0) {
    await dbUpdate('recurring_transactions', id, dbUpdates);
  }
};

export const deleteRecurring = async (id: string): Promise<void> => {
  await dbDelete('recurring_transactions', id);
};

export const toggleRecurring = async (id: string, isActive: boolean): Promise<void> => {
  await updateRecurring(id, { isActive });
};

// ===== Mark as Paid =====

export const markAsPaid = async (
  id: string,
  actualAmount: number,
  userId: string,
  accountId: string
): Promise<string> => {
  const tx = await getRecurringById(id);
  if (!tx) throw new Error('Recurring transaction not found');

  const today = new Date().toISOString().split('T')[0];
  const currency = getCurrentCurrency();

  // Create a real transaction
  const transactionId = await createTransaction({
    userId,
    accountId,
    type: tx.type,
    amount: actualAmount,
    currency,
    categoryId: tx.categoryId,
    subcategoryId: tx.subcategoryId,
    description: tx.description,
    date: today,
    tags: [],
    isRecurring: true,
    recurringId: id,
  });

  // Advance nextDueDate to future
  const newNextDueDate = advanceToFuture(tx.frequency, tx.nextDueDate);

  await updateRecurring(id, {
    lastPaidDate: today,
    nextDueDate: newNextDueDate,
  });

  return transactionId;
};

// Mark as paid without creating a transaction (for already-paid items)
export const markAsPaidOnly = async (id: string): Promise<void> => {
  const tx = await getRecurringById(id);
  if (!tx) throw new Error('Recurring transaction not found');

  const today = new Date().toISOString().split('T')[0];
  const newNextDueDate = advanceToFuture(tx.frequency, tx.nextDueDate);

  await updateRecurring(id, {
    lastPaidDate: today,
    nextDueDate: newNextDueDate,
  });
};

// ===== Subscription Summary =====

export const getSubscriptionSummary = async (
  userId: string
): Promise<{
  subscriptions: Array<{
    id: string;
    description: string;
    amount: number;
    frequency: string;
    categoryId: string;
    yearlyAmount: number;
    isActive: boolean;
  }>;
  totalMonthly: number;
  totalYearly: number;
}> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM recurring_transactions WHERE user_id = ? AND type = ?',
    [userId, 'expense']
  );

  const frequencyMultipliers: Record<string, number> = {
    weekly: 52,
    biweekly: 26,
    monthly: 12,
    quarterly: 4,
    yearly: 1,
  };

  const subscriptions = rows.map((row: any) => {
    const multiplier = frequencyMultipliers[row.frequency] || 12;
    const yearlyAmount = row.amount * multiplier;

    return {
      id: row.id,
      description: row.description,
      amount: row.amount,
      frequency: row.frequency,
      categoryId: row.category_id,
      yearlyAmount,
      isActive: !!row.is_active,
    };
  });

  subscriptions.sort((a, b) => b.yearlyAmount - a.yearlyAmount);

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  const totalYearly = activeSubscriptions.reduce((sum, s) => sum + s.yearlyAmount, 0);
  const totalMonthly = totalYearly / 12;

  return { subscriptions, totalMonthly, totalYearly };
};

// ===== Dashboard helpers =====

export const getRecurringPaymentStatus = async (
  userId: string
): Promise<{
  unpaidCount: number;
  overdueCount: number;
  totalDueThisMonth: number;
}> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM recurring_transactions WHERE user_id = ? AND is_active = 1',
    [userId]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let unpaidCount = 0;
  let overdueCount = 0;
  let totalDueThisMonth = 0;

  for (const row of rows) {
    const tx = mapRow(row);
    const paid = isPaidThisMonth(tx);

    // Only count monthly-cycle items for "due this month" total
    if (tx.type === 'expense') {
      totalDueThisMonth += tx.amount;
    }

    if (!paid) {
      unpaidCount++;
      const dueDate = new Date(tx.nextDueDate);
      if (dueDate.getTime() < today.getTime()) {
        overdueCount++;
      }
    }
  }

  return { unpaidCount, overdueCount, totalDueThisMonth };
};

// ===== Row mapper =====

const mapRow = (row: any): RecurringTransaction => ({
  id: row.id,
  userId: row.user_id,
  description: row.description,
  amount: row.amount,
  type: row.type,
  categoryId: row.category_id,
  subcategoryId: row.subcategory_id || undefined,
  accountId: row.account_id || undefined,
  frequency: row.frequency,
  nextDueDate: row.next_due_date,
  lastPaidDate: row.last_paid_date || undefined,
  isActive: !!row.is_active,
  createdAt: row.created_at,
});
