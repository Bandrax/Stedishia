import * as Crypto from 'expo-crypto';
import { dbInsert, dbUpdate, dbQuery } from './database';
import { getTotalBalance } from './dashboardService';
import type { Household } from '../types';

// Generiraj pozivni kod (format: KUC-XXXX)
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez I/O/0/1 za čitljivost
  let code = '';
  const bytes = Crypto.getRandomValues(new Uint8Array(4));
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `KUC-${code}`;
};

// Kreiraj novo kućanstvo
export const createHousehold = async (
  userId: string,
  name: string
): Promise<Household> => {
  const id = Crypto.randomUUID();
  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();

  await dbInsert('households', {
    id,
    name,
    invite_code: inviteCode,
    created_at: now,
  });

  // Poveži korisnika s kućanstvom
  await dbUpdate('users', userId, {
    household_id: id,
    updated_at: now,
  });

  return {
    id,
    name,
    inviteCode,
    members: [userId],
    createdAt: now,
  };
};

// Pridruži se kućanstvu putem pozivnog koda
export const joinHousehold = async (
  userId: string,
  inviteCode: string
): Promise<Household | null> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM households WHERE invite_code = ?',
    [inviteCode.toUpperCase().trim()]
  );

  if (rows.length === 0) return null;

  const household = rows[0];
  const now = new Date().toISOString();

  // Provjeri je li korisnik već član
  const existingMember = await dbQuery<any>(
    'SELECT id FROM users WHERE id = ? AND household_id = ?',
    [userId, household.id]
  );

  if (existingMember.length > 0) {
    // Već je član, samo vrati kućanstvo
    return await getHouseholdById(household.id);
  }

  // Poveži korisnika s kućanstvom
  await dbUpdate('users', userId, {
    household_id: household.id,
    updated_at: now,
  });

  return await getHouseholdById(household.id);
};

// Napusti kućanstvo
export const leaveHousehold = async (userId: string): Promise<void> => {
  const now = new Date().toISOString();
  await dbUpdate('users', userId, {
    household_id: null,
    updated_at: now,
  });
};

// Dohvati kućanstvo po ID-u
export const getHouseholdById = async (householdId: string): Promise<Household | null> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM households WHERE id = ?',
    [householdId]
  );

  if (rows.length === 0) return null;

  const h = rows[0];
  const members = await dbQuery<{ id: string }>(
    'SELECT id FROM users WHERE household_id = ?',
    [householdId]
  );

  return {
    id: h.id,
    name: h.name,
    inviteCode: h.invite_code || '',
    members: members.map((m) => m.id),
    createdAt: h.created_at,
  };
};

// Dohvati stanja članova kućanstva (samo ukupna stanja + mjesečna potrošnja)
export const getHouseholdMemberBalances = async (
  householdId: string,
  month: string
): Promise<Array<{
  userId: string;
  name: string;
  totalBalance: number;
  monthlyExpenses: number;
}>> => {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const members = await dbQuery<{ id: string; name: string }>(
    'SELECT id, name FROM users WHERE household_id = ?',
    [householdId]
  );

  const results = [];
  for (const member of members) {
    const totalBalance = await getTotalBalance(member.id);

    const expenseResult = await dbQuery<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
      [member.id, startDate, endDate]
    );

    results.push({
      userId: member.id,
      name: member.name,
      totalBalance,
      monthlyExpenses: expenseResult[0]?.total ?? 0,
    });
  }

  return results;
};
