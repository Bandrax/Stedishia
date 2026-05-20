import * as Crypto from 'expo-crypto';
import { dbInsert, dbUpdate, dbDelete, dbQuery, dbGetAll, getDatabase } from './database';
import { getCurrentMonth } from '../utils';
import type { Transaction, RecurringTransaction } from '../types';

// Spremi novu transakciju i ažuriraj stanje računa
export const createTransaction = async (
  tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  await dbInsert('transactions', {
    id,
    user_id: tx.userId,
    account_id: tx.accountId,
    to_account_id: tx.toAccountId || null,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    category_id: tx.categoryId,
    subcategory_id: tx.subcategoryId || null,
    description: tx.description,
    note: tx.note || null,
    date: tx.date,
    tags: JSON.stringify(tx.tags || []),
    is_recurring: tx.isRecurring ? 1 : 0,
    recurring_id: tx.recurringId || null,
    split_parts: tx.splitParts ? JSON.stringify(tx.splitParts) : null,
    location: tx.location ? JSON.stringify(tx.location) : null,
    created_at: now,
    updated_at: now,
  });

  const db = await getDatabase();

  if (tx.type === 'transfer' && tx.toAccountId) {
    // Transfer: smanji izvorni račun, povećaj odredišni
    await db.runAsync(
      'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?',
      [tx.amount, now, tx.accountId]
    );
    await db.runAsync(
      'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [tx.amount, now, tx.toAccountId]
    );
  } else {
    // Income/expense: standardna logika
    const balanceChange = tx.type === 'income' ? tx.amount : -tx.amount;
    await db.runAsync(
      'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [balanceChange, now, tx.accountId]
    );
  }

  return id;
};

// Ažuriraj transakciju
export const updateTransaction = async (
  id: string,
  updates: Partial<Transaction>,
  oldTx: Transaction
): Promise<void> => {
  const now = new Date().toISOString();
  const db = await getDatabase();

  // Ako se promijenio iznos ili tip, ažuriraj stanje računa
  if (updates.amount !== undefined || updates.type !== undefined) {
    if (oldTx.type === 'transfer' && oldTx.toAccountId) {
      // Vrati stare transfer promjene
      await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?', [oldTx.amount, now, oldTx.accountId]);
      await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?', [oldTx.amount, now, oldTx.toAccountId]);
    } else {
      const oldChange = oldTx.type === 'income' ? oldTx.amount : -oldTx.amount;
      await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?', [oldChange, now, oldTx.accountId]);
    }

    const newType = updates.type || oldTx.type;
    const newAmount = updates.amount ?? oldTx.amount;
    const newAccountId = updates.accountId || oldTx.accountId;
    const newToAccountId = updates.toAccountId ?? oldTx.toAccountId;

    if (newType === 'transfer' && newToAccountId) {
      await db.runAsync('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?', [newAmount, now, newAccountId]);
      await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?', [newAmount, now, newToAccountId]);
    } else {
      const newChange = newType === 'income' ? newAmount : -newAmount;
      await db.runAsync('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?', [newChange, now, newAccountId]);
    }
  }

  const dbUpdates: Record<string, unknown> = { updated_at: now };
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
  if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.note !== undefined) dbUpdates.note = updates.note;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.tags !== undefined) dbUpdates.tags = JSON.stringify(updates.tags);
  if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
  if (updates.toAccountId !== undefined) dbUpdates.to_account_id = updates.toAccountId;

  await dbUpdate('transactions', id, dbUpdates);
};

// Obriši transakciju i vrati stanje računa
export const deleteTransaction = async (tx: Transaction): Promise<void> => {
  const now = new Date().toISOString();
  const db = await getDatabase();

  if (tx.type === 'transfer' && tx.toAccountId) {
    // Transfer: vrati novac na izvorni, oduzmi s odredišnog
    await db.runAsync(
      'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [tx.amount, now, tx.accountId]
    );
    await db.runAsync(
      'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?',
      [tx.amount, now, tx.toAccountId]
    );
  } else {
    const balanceRevert = tx.type === 'income' ? -tx.amount : tx.amount;
    await db.runAsync(
      'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [balanceRevert, now, tx.accountId]
    );
  }

  await dbDelete('transactions', tx.id);
};

// Dohvati transakcije s filterima
export interface TransactionFilter {
  userId: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  accountId?: string;
  type?: string;
  tags?: string[];
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export const getTransactions = async (
  filter: TransactionFilter
): Promise<Transaction[]> => {
  const conditions: string[] = ['t.user_id = ?'];
  const params: (string | number)[] = [filter.userId];

  if (filter.dateFrom) {
    conditions.push('t.date >= ?');
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    conditions.push('t.date <= ?');
    params.push(filter.dateTo);
  }
  if (filter.categoryId) {
    conditions.push('t.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.accountId) {
    conditions.push('t.account_id = ?');
    params.push(filter.accountId);
  }
  if (filter.type) {
    conditions.push('t.type = ?');
    params.push(filter.type);
  }
  if (filter.searchQuery) {
    conditions.push('t.description LIKE ?');
    params.push(`%${filter.searchQuery}%`);
  }

  const limit = filter.limit || 50;
  const offset = filter.offset || 0;

  const rows = await dbQuery<any>(
    `SELECT t.* FROM transactions t
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows.map(mapRowToTransaction);
};

// Mapiraj DB red u Transaction tip
const mapRowToTransaction = (row: any): Transaction => ({
  id: row.id,
  userId: row.user_id,
  accountId: row.account_id,
  toAccountId: row.to_account_id || undefined,
  type: row.type,
  amount: row.amount,
  currency: row.currency,
  categoryId: row.category_id,
  subcategoryId: row.subcategory_id,
  description: row.description,
  note: row.note,
  date: row.date,
  tags: row.tags ? JSON.parse(row.tags) : [],
  isRecurring: row.is_recurring === 1,
  recurringId: row.recurring_id,
  splitParts: row.split_parts ? JSON.parse(row.split_parts) : undefined,
  location: row.location ? JSON.parse(row.location) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Dohvati jednu transakciju
export const getTransactionById = async (id: string): Promise<Transaction | null> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? mapRowToTransaction(rows[0]) : null;
};
