import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { dbQuery, dbInsert, dbUpdate } from './database';
import type { SyncData } from '../types';
import i18n from '../locales/i18n';

const SYNC_VERSION = 1;

// Eksportiraj sve podatke korisnika u JSON
export const exportUserData = async (userId: string, householdId: string): Promise<string> => {
  const transactions = await dbQuery<any>(
    'SELECT * FROM transactions WHERE user_id = ?',
    [userId]
  );

  const accounts = await dbQuery<any>(
    'SELECT * FROM accounts WHERE user_id = ?',
    [userId]
  );

  const budgetItems = await dbQuery<any>(
    'SELECT * FROM budget_items WHERE user_id = ?',
    [userId]
  );

  const goals = await dbQuery<any>(
    'SELECT * FROM savings_goals WHERE user_id = ?',
    [userId]
  );

  const debts = await dbQuery<any>(
    'SELECT * FROM debts WHERE user_id = ?',
    [userId]
  );

  const recurringTransactions = await dbQuery<any>(
    'SELECT * FROM recurring_transactions WHERE user_id = ?',
    [userId]
  );

  const syncData: SyncData = {
    version: SYNC_VERSION,
    userId,
    householdId,
    exportedAt: new Date().toISOString(),
    transactions: transactions.map(mapTransactionRow),
    accounts: accounts.map(mapAccountRow),
    budgetItems: budgetItems.map(mapBudgetRow),
    goals: goals.map(mapGoalRow),
    debts: debts.map(mapDebtRow),
    recurringTransactions: recurringTransactions.map(mapRecurringRow),
  };

  return JSON.stringify(syncData, null, 2);
};

// Spremi export u datoteku i ponudi dijeljenje
export const exportToFile = async (userId: string, householdId: string): Promise<string> => {
  const json = await exportUserData(userId, householdId);
  const filename = `mojnovcnik_${userId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.json`;
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(json);

  const filePath = file.uri;

  // Ponudi dijeljenje (za Google Drive, AirDrop, itd.)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: i18n.t('sync.exportDialogTitle'),
    });
  }

  return filePath;
};

// Importiraj podatke iz JSON datoteke
export const importFromFile = async (): Promise<SyncData | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const uri = result.assets[0].uri;
  const file = new File(uri);
  const content = await file.text();

  const data = JSON.parse(content) as SyncData;

  if (!data.version || !data.userId) {
    throw new Error('Nevaljan format datoteke');
  }

  return data;
};

// Merge importiranih podataka u lokalnu bazu
export const mergeImportedData = async (
  data: SyncData,
  currentUserId: string,
  strategy: 'merge' | 'replace' = 'merge'
): Promise<{
  transactionsImported: number;
  accountsImported: number;
  goalsImported: number;
  debtsImported: number;
  conflicts: number;
}> => {
  let transactionsImported = 0;
  let accountsImported = 0;
  let goalsImported = 0;
  let debtsImported = 0;
  let conflicts = 0;

  // Import transakcija
  for (const tx of data.transactions) {
    const existing = await dbQuery<any>('SELECT id FROM transactions WHERE id = ?', [tx.id]);
    if (existing.length === 0) {
      await dbInsert('transactions', {
        id: tx.id,
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
        created_at: tx.createdAt,
        updated_at: tx.updatedAt,
      });
      transactionsImported++;
    } else if (strategy === 'replace') {
      conflicts++;
    } else {
      conflicts++;
    }
  }

  // Import računa
  for (const acc of data.accounts) {
    const existing = await dbQuery<any>('SELECT id FROM accounts WHERE id = ?', [acc.id]);
    if (existing.length === 0) {
      await dbInsert('accounts', {
        id: acc.id,
        user_id: acc.userId,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        color: acc.color,
        icon: acc.icon,
        is_default: acc.isDefault ? 1 : 0,
        include_in_total: acc.includeInTotal ? 1 : 0,
        created_at: acc.createdAt,
        updated_at: acc.updatedAt,
      });
      accountsImported++;
    } else {
      conflicts++;
    }
  }

  // Import ciljeva
  for (const goal of data.goals) {
    const existing = await dbQuery<any>('SELECT id FROM savings_goals WHERE id = ?', [goal.id]);
    if (existing.length === 0) {
      await dbInsert('savings_goals', {
        id: goal.id,
        user_id: goal.userId,
        name: goal.name,
        emoji: goal.emoji,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        target_date: goal.targetDate,
        monthly_contribution: goal.monthlyContribution,
        status: goal.status,
        color: goal.color,
        created_at: goal.createdAt,
        updated_at: goal.updatedAt,
      });
      goalsImported++;
    } else {
      conflicts++;
    }
  }

  // Import dugova
  for (const debt of data.debts) {
    const existing = await dbQuery<any>('SELECT id FROM debts WHERE id = ?', [debt.id]);
    if (existing.length === 0) {
      await dbInsert('debts', {
        id: debt.id,
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
        created_at: debt.createdAt,
        updated_at: debt.updatedAt,
      });
      debtsImported++;
    } else {
      conflicts++;
    }
  }

  return {
    transactionsImported,
    accountsImported,
    goalsImported,
    debtsImported,
    conflicts,
  };
};

// Dohvati kućansku statistiku (sve korisnike)
export const getHouseholdStats = async (
  householdId: string,
  month: string
): Promise<{
  totalIncome: number;
  totalExpenses: number;
  memberStats: Array<{
    userId: string;
    name: string;
    income: number;
    expenses: number;
  }>;
}> => {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  // Dohvati članove kućanstva
  const members = await dbQuery<{ id: string; name: string }>(
    'SELECT id, name FROM users WHERE household_id = ?',
    [householdId]
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  const memberStats: Array<{
    userId: string; name: string; income: number; expenses: number;
  }> = [];

  for (const member of members) {
    const incomeResult = await dbQuery<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?`,
      [member.id, startDate, endDate]
    );

    const expenseResult = await dbQuery<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
      [member.id, startDate, endDate]
    );

    const income = incomeResult[0]?.total ?? 0;
    const expenses = expenseResult[0]?.total ?? 0;

    totalIncome += income;
    totalExpenses += expenses;

    memberStats.push({
      userId: member.id,
      name: member.name,
      income,
      expenses,
    });
  }

  return { totalIncome, totalExpenses, memberStats };
};

// Mapper functions
const mapTransactionRow = (row: any) => ({
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
  tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
  isRecurring: !!row.is_recurring,
  recurringId: row.recurring_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAccountRow = (row: any) => ({
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

const mapBudgetRow = (row: any) => ({
  id: row.id,
  userId: row.user_id,
  month: row.month,
  categoryId: row.category_id,
  allocated: row.allocated,
  spent: row.spent || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapGoalRow = (row: any) => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  emoji: row.emoji,
  targetAmount: row.target_amount,
  currentAmount: row.current_amount,
  targetDate: row.target_date,
  monthlyContribution: row.monthly_contribution,
  status: row.status,
  color: row.color,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDebtRow = (row: any) => ({
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

const mapRecurringRow = (row: any) => ({
  id: row.id,
  userId: row.user_id,
  accountId: row.account_id,
  type: row.type,
  amount: row.amount,
  categoryId: row.category_id,
  subcategoryId: row.subcategory_id,
  description: row.description,
  frequency: row.frequency,
  startDate: row.start_date || row.created_at,
  endDate: row.end_date,
  nextDueDate: row.next_due_date,
  isActive: !!row.is_active,
  autoAdd: !!row.auto_add,
  reminderDaysBefore: row.reminder_days_before ?? 3,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
