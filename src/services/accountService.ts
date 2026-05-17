import { v4 as uuid } from 'uuid';
import { dbInsert, dbUpdate, dbDelete, dbQuery } from './database';
import type { Account } from '../types';

export const createAccount = async (
  account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const id = uuid();

  await dbInsert('accounts', {
    id,
    user_id: account.userId,
    name: account.name,
    type: account.type,
    balance: account.balance,
    currency: account.currency,
    color: account.color,
    icon: account.icon,
    is_default: account.isDefault ? 1 : 0,
    include_in_total: account.includeInTotal ? 1 : 0,
    created_at: now,
    updated_at: now,
  });

  return id;
};

export const getAccounts = async (userId: string): Promise<Account[]> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM accounts WHERE user_id = ? ORDER BY is_default DESC, name ASC',
    [userId]
  );
  return rows.map(mapRowToAccount);
};

export const updateAccount = async (
  id: string,
  updates: Partial<Account>
): Promise<void> => {
  const now = new Date().toISOString();
  const dbUpdates: Record<string, unknown> = { updated_at: now };

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault ? 1 : 0;
  if (updates.includeInTotal !== undefined) dbUpdates.include_in_total = updates.includeInTotal ? 1 : 0;

  await dbUpdate('accounts', id, dbUpdates);
};

export const deleteAccountById = async (id: string): Promise<void> => {
  await dbDelete('accounts', id);
};

const mapRowToAccount = (row: any): Account => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  type: row.type,
  balance: row.balance,
  currency: row.currency,
  color: row.color,
  icon: row.icon,
  isDefault: !!row.is_default,
  includeInTotal: !!row.include_in_total,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
