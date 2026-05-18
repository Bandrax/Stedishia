import * as Crypto from 'expo-crypto';
import { dbInsert, dbUpdate, dbDelete, dbQuery } from './database';

export interface RecurringTransaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  accountId: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createRecurring = async (
  tx: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  await dbInsert('recurring_transactions', {
    id,
    user_id: tx.userId,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    category_id: tx.categoryId,
    account_id: tx.accountId,
    frequency: tx.frequency,
    next_due_date: tx.nextDueDate,
    is_active: tx.isActive ? 1 : 0,
    created_at: now,
    updated_at: now,
  });

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

export const updateRecurring = async (
  id: string,
  updates: Partial<RecurringTransaction>
): Promise<void> => {
  const now = new Date().toISOString();
  const dbUpdates: Record<string, unknown> = { updated_at: now };

  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
  if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  if (updates.nextDueDate !== undefined) dbUpdates.next_due_date = updates.nextDueDate;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive ? 1 : 0;

  await dbUpdate('recurring_transactions', id, dbUpdates);
};

export const deleteRecurring = async (id: string): Promise<void> => {
  await dbDelete('recurring_transactions', id);
};

export const toggleRecurring = async (id: string, isActive: boolean): Promise<void> => {
  await updateRecurring(id, { isActive });
};

const mapRow = (row: any): RecurringTransaction => ({
  id: row.id,
  userId: row.user_id,
  description: row.description,
  amount: row.amount,
  type: row.type,
  categoryId: row.category_id,
  accountId: row.account_id,
  frequency: row.frequency,
  nextDueDate: row.next_due_date,
  isActive: !!row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
