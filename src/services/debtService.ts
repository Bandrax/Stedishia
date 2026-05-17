import { v4 as uuid } from 'uuid';
import { dbInsert, dbUpdate, dbDelete, dbQuery } from './database';
import type { Debt } from '../types';

export const createDebt = async (
  debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const id = uuid();

  await dbInsert('debts', {
    id,
    user_id: debt.userId,
    name: debt.name,
    total_amount: debt.totalAmount,
    remaining_amount: debt.remainingAmount,
    interest_rate: debt.interestRate,
    minimum_payment: debt.minimumPayment,
    due_date: debt.dueDate,
    start_date: debt.startDate,
    end_date: debt.endDate || null,
    type: debt.type,
    created_at: now,
    updated_at: now,
  });

  return id;
};

export const getDebts = async (userId: string): Promise<Debt[]> => {
  const rows = await dbQuery<any>(
    'SELECT * FROM debts WHERE user_id = ? ORDER BY interest_rate DESC',
    [userId]
  );
  return rows.map(mapRowToDebt);
};

export const updateDebt = async (
  id: string,
  updates: Partial<Debt>
): Promise<void> => {
  const now = new Date().toISOString();
  const dbUpdates: Record<string, unknown> = { updated_at: now };

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
  if (updates.remainingAmount !== undefined) dbUpdates.remaining_amount = updates.remainingAmount;
  if (updates.interestRate !== undefined) dbUpdates.interest_rate = updates.interestRate;
  if (updates.minimumPayment !== undefined) dbUpdates.minimum_payment = updates.minimumPayment;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.type !== undefined) dbUpdates.type = updates.type;

  await dbUpdate('debts', id, dbUpdates);
};

export const deleteDebtById = async (id: string): Promise<void> => {
  await dbDelete('debts', id);
};

export const makePayment = async (id: string, amount: number): Promise<Debt | null> => {
  const rows = await dbQuery<any>('SELECT * FROM debts WHERE id = ?', [id]);
  if (rows.length === 0) return null;

  const debt = mapRowToDebt(rows[0]);
  const newRemaining = Math.max(0, debt.remainingAmount - amount);

  await updateDebt(id, { remainingAmount: newRemaining });
  return { ...debt, remainingAmount: newRemaining };
};

// Snowball strategija: najmanji dug prvo
export const getSnowballOrder = (debts: Debt[]): Debt[] => {
  return [...debts]
    .filter((d) => d.remainingAmount > 0)
    .sort((a, b) => a.remainingAmount - b.remainingAmount);
};

// Avalanche strategija: najviša kamata prvo
export const getAvalancheOrder = (debts: Debt[]): Debt[] => {
  return [...debts]
    .filter((d) => d.remainingAmount > 0)
    .sort((a, b) => b.interestRate - a.interestRate);
};

// Izračunaj amortizacijsku tablicu
export const calculateAmortization = (
  principal: number,
  annualRate: number,
  monthlyPayment: number
): Array<{
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> => {
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;
  const schedule: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }> = [];

  let month = 0;
  while (balance > 0 && month < 600) { // max 50 godina
    month++;
    const interest = balance * monthlyRate;
    const actualPayment = Math.min(monthlyPayment, balance + interest);
    const principalPaid = actualPayment - interest;
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      month,
      payment: actualPayment,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return schedule;
};

// Izračunaj ukupne kamate za dug
export const calculateTotalInterest = (
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number => {
  const schedule = calculateAmortization(principal, annualRate, monthlyPayment);
  return schedule.reduce((sum, row) => sum + row.interest, 0);
};

// Usporedi snowball vs avalanche
export const compareStrategies = (
  debts: Debt[],
  extraPayment: number = 0
): {
  snowball: { totalInterest: number; monthsToPayoff: number };
  avalanche: { totalInterest: number; monthsToPayoff: number };
  savings: number;
} => {
  const simulate = (ordered: Debt[]) => {
    const remaining = ordered.map((d) => ({ ...d }));
    let totalInterest = 0;
    let months = 0;
    const totalMinimum = remaining.reduce((s, d) => s + d.minimumPayment, 0);

    while (remaining.some((d) => d.remainingAmount > 0) && months < 600) {
      months++;
      let extra = extraPayment;

      for (const debt of remaining) {
        if (debt.remainingAmount <= 0) {
          extra += debt.minimumPayment;
          continue;
        }

        const monthlyRate = debt.interestRate / 100 / 12;
        const interest = debt.remainingAmount * monthlyRate;
        totalInterest += interest;

        let payment = debt.minimumPayment + extra;
        extra = 0;
        payment = Math.min(payment, debt.remainingAmount + interest);

        debt.remainingAmount = Math.max(0, debt.remainingAmount + interest - payment);
      }
    }

    return { totalInterest, monthsToPayoff: months };
  };

  const snowball = simulate(getSnowballOrder(debts));
  const avalanche = simulate(getAvalancheOrder(debts));

  return {
    snowball,
    avalanche,
    savings: snowball.totalInterest - avalanche.totalInterest,
  };
};

// Detektiraj pretplate iz recurring transakcija
export const detectSubscriptions = async (
  userId: string
): Promise<Array<{
  id: string;
  description: string;
  amount: number;
  frequency: string;
  categoryId: string;
  yearlyTotal: number;
}>> => {
  const rows = await dbQuery<any>(
    `SELECT id, description, amount, frequency, category_id
     FROM recurring_transactions
     WHERE user_id = ? AND is_active = 1 AND type = 'expense'
     ORDER BY amount DESC`,
    [userId]
  );

  return rows.map((r: any) => {
    let yearlyMultiplier = 12;
    if (r.frequency === 'weekly') yearlyMultiplier = 52;
    if (r.frequency === 'biweekly') yearlyMultiplier = 26;
    if (r.frequency === 'quarterly') yearlyMultiplier = 4;
    if (r.frequency === 'yearly') yearlyMultiplier = 1;

    return {
      id: r.id,
      description: r.description,
      amount: r.amount,
      frequency: r.frequency,
      categoryId: r.category_id,
      yearlyTotal: r.amount * yearlyMultiplier,
    };
  });
};

const mapRowToDebt = (row: any): Debt => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  totalAmount: row.total_amount,
  remainingAmount: row.remaining_amount,
  interestRate: row.interest_rate,
  minimumPayment: row.minimum_payment,
  dueDate: row.due_date,
  startDate: row.start_date,
  endDate: row.end_date,
  type: row.type,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
