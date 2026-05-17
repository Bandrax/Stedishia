import { v4 as uuid } from 'uuid';
import { dbInsert, dbQuery } from './database';

// Generira 3 mjeseca mock podataka za testiranje
export const seedTestData = async (userId: string, householdId: string): Promise<void> => {
  // Provjeri je li već seedirano
  const existing = await dbQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?',
    [userId]
  );
  if ((existing[0]?.count ?? 0) > 0) return;

  const now = new Date();
  const accounts = await createTestAccounts(userId);
  await createTestTransactions(userId, accounts, now);
  await createTestBudget(userId, now);
  await createTestGoals(userId);
  await createTestDebts(userId);
  await createTestRecurring(userId, accounts[0]);
};

const createTestAccounts = async (userId: string): Promise<string[]> => {
  const now = new Date().toISOString();
  const accounts = [
    { name: 'Tekući račun', type: 'checking', balance: 2450.00, color: '#0F4C3A', icon: '🏦' },
    { name: 'Štedni račun', type: 'savings', balance: 5200.00, color: '#2196F3', icon: '🐷' },
    { name: 'Gotovina', type: 'cash', balance: 150.00, color: '#FF9800', icon: '💵' },
    { name: 'Visa kartica', type: 'credit_card', balance: -320.00, color: '#9C27B0', icon: '💳' },
  ];

  const ids: string[] = [];
  for (const acc of accounts) {
    const id = uuid();
    ids.push(id);
    await dbInsert('accounts', {
      id,
      user_id: userId,
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      currency: 'EUR',
      color: acc.color,
      icon: acc.icon,
      is_default: ids.length === 1 ? 1 : 0,
      include_in_total: 1,
      created_at: now,
      updated_at: now,
    });
  }

  return ids;
};

const createTestTransactions = async (
  userId: string,
  accountIds: string[],
  now: Date
): Promise<void> => {
  const mainAccount = accountIds[0];
  const cashAccount = accountIds[2];

  // 3 mjeseca transakcija
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

    // Prihodi
    await insertTx(userId, mainAccount, 'income', 'personal', 3200, 'salary', 'Plaća', `${monthStr}-10`, []);
    if (monthOffset === 0) {
      await insertTx(userId, mainAccount, 'income', 'personal', 150, 'freelance', 'Freelance projekt', `${monthStr}-18`, ['bonus']);
    }

    // Stanovanje (zajednički)
    await insertTx(userId, mainAccount, 'expense', 'shared', 450, 'housing', 'Najam stana', `${monthStr}-01`, ['režije']);
    await insertTx(userId, mainAccount, 'expense', 'shared', 85, 'utilities', 'Struja - HEP', `${monthStr}-05`, ['režije']);
    await insertTx(userId, mainAccount, 'expense', 'shared', 35, 'utilities', 'Voda', `${monthStr}-05`, ['režije']);
    await insertTx(userId, mainAccount, 'expense', 'shared', 30, 'utilities', 'Internet - A1', `${monthStr}-03`, ['režije']);

    // Hrana (mješovito)
    const foodDays = [3, 7, 10, 14, 17, 21, 25, 28];
    const foodDescriptions = [
      'Konzum - tjedna kupovina', 'Lidl - namirnice', 'Spar - kupovina',
      'Kaufland - velika kupovina', 'Konzum', 'Lidl', 'Tommy', 'Plodine',
    ];
    const foodAmounts = [65, 42, 55, 95, 38, 52, 73, 45];
    for (let i = 0; i < foodDays.length; i++) {
      const day = Math.min(foodDays[i], 28);
      const scope = i % 2 === 0 ? 'shared' : 'personal';
      await insertTx(userId, mainAccount, 'expense', scope as any, foodAmounts[i] + Math.random() * 20 - 10, 'food', foodDescriptions[i], `${monthStr}-${String(day).padStart(2, '0')}`, ['hrana']);
    }

    // Transport
    await insertTx(userId, mainAccount, 'expense', 'personal', 45, 'transport', 'Gorivo - INA', `${monthStr}-08`, []);
    await insertTx(userId, mainAccount, 'expense', 'personal', 30, 'transport', 'ZET mjesečna', `${monthStr}-02`, []);

    // Zabava
    await insertTx(userId, cashAccount, 'expense', 'shared', 35, 'entertainment', 'Cinestar - kino', `${monthStr}-12`, ['zabava']);
    await insertTx(userId, mainAccount, 'expense', 'personal', 25, 'entertainment', 'Netflix', `${monthStr}-15`, ['pretplata']);
    await insertTx(userId, mainAccount, 'expense', 'personal', 12, 'entertainment', 'Spotify', `${monthStr}-15`, ['pretplata']);

    // Restorani
    await insertTx(userId, mainAccount, 'expense', 'shared', 42, 'dining', 'Wolt - dostava', `${monthStr}-09`, []);
    await insertTx(userId, mainAccount, 'expense', 'shared', 65, 'dining', 'Restoran Vinodol', `${monthStr}-20`, []);
    if (monthOffset < 2) {
      await insertTx(userId, cashAccount, 'expense', 'personal', 18, 'dining', 'Kava i kolač', `${monthStr}-16`, []);
    }

    // Zdravlje
    await insertTx(userId, mainAccount, 'expense', 'personal', 25, 'health', 'Ljekarna', `${monthStr}-11`, []);

    // Shopping
    if (monthOffset === 1) {
      await insertTx(userId, mainAccount, 'expense', 'personal', 89, 'shopping', 'Zara - odjeća', `${monthStr}-22`, ['shopping']);
    }
    if (monthOffset === 0) {
      await insertTx(userId, mainAccount, 'expense', 'shared', 45, 'home', 'IKEA - dekor', `${monthStr}-13`, ['dom']);
    }

    // Edukacija
    await insertTx(userId, mainAccount, 'expense', 'personal', 15, 'education', 'Udemy kurs', `${monthStr}-06`, ['razvoj']);

    // Mobitel
    await insertTx(userId, mainAccount, 'expense', 'personal', 20, 'phone', 'A1 - mobitel', `${monthStr}-04`, ['režije']);
  }
};

const createTestBudget = async (userId: string, now: Date): Promise<void> => {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nowStr = now.toISOString();

  const budgetItems = [
    { categoryId: 'housing', allocated: 600 },
    { categoryId: 'food', allocated: 500 },
    { categoryId: 'transport', allocated: 100 },
    { categoryId: 'entertainment', allocated: 80 },
    { categoryId: 'dining', allocated: 150 },
    { categoryId: 'health', allocated: 50 },
    { categoryId: 'shopping', allocated: 100 },
    { categoryId: 'utilities', allocated: 150 },
    { categoryId: 'education', allocated: 30 },
    { categoryId: 'phone', allocated: 25 },
  ];

  for (const item of budgetItems) {
    await dbInsert('budget_items', {
      id: uuid(),
      user_id: userId,
      category_id: item.categoryId,
      month,
      allocated: item.allocated,
      scope: 'personal',
      created_at: nowStr,
      updated_at: nowStr,
    });
  }
};

const createTestGoals = async (userId: string): Promise<void> => {
  const now = new Date().toISOString();
  const goals = [
    {
      name: 'Odmor u Grčkoj',
      emoji: '🏖️',
      targetAmount: 2000,
      currentAmount: 850,
      targetDate: '2026-08-01',
      color: '#2196F3',
      status: 'active',
    },
    {
      name: 'Novi laptop',
      emoji: '💻',
      targetAmount: 1200,
      currentAmount: 400,
      targetDate: '2026-12-01',
      color: '#9C27B0',
      status: 'active',
    },
    {
      name: 'Sigurnosni fond',
      emoji: '🛡️',
      targetAmount: 9000,
      currentAmount: 5200,
      targetDate: '2027-06-01',
      color: '#0F4C3A',
      status: 'active',
    },
  ];

  for (const goal of goals) {
    await dbInsert('savings_goals', {
      id: uuid(),
      user_id: userId,
      name: goal.name,
      emoji: goal.emoji,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate,
      monthly_contribution: 0,
      status: goal.status,
      color: goal.color,
      created_at: now,
      updated_at: now,
    });
  }
};

const createTestDebts = async (userId: string): Promise<void> => {
  const now = new Date().toISOString();

  await dbInsert('debts', {
    id: uuid(),
    user_id: userId,
    name: 'Auto kredit',
    total_amount: 12000,
    remaining_amount: 8500,
    interest_rate: 5.9,
    minimum_payment: 250,
    due_date: '15',
    start_date: '2024-06-01',
    end_date: '2028-06-01',
    type: 'car_loan',
    created_at: now,
    updated_at: now,
  });

  await dbInsert('debts', {
    id: uuid(),
    user_id: userId,
    name: 'Visa kartica',
    total_amount: 500,
    remaining_amount: 320,
    interest_rate: 14.5,
    minimum_payment: 50,
    due_date: '25',
    start_date: '2026-01-01',
    type: 'credit_card',
    created_at: now,
    updated_at: now,
  });
};

const createTestRecurring = async (userId: string, accountId: string): Promise<void> => {
  const now = new Date();
  const nowStr = now.toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const recurring = [
    { desc: 'Netflix', amount: 25, freq: 'monthly', catId: 'entertainment', nextDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-15` },
    { desc: 'Spotify', amount: 12, freq: 'monthly', catId: 'entertainment', nextDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-15` },
    { desc: 'A1 mobitel', amount: 20, freq: 'monthly', catId: 'phone', nextDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-04` },
    { desc: 'Internet', amount: 30, freq: 'monthly', catId: 'utilities', nextDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-03` },
    { desc: 'Teretana', amount: 35, freq: 'monthly', catId: 'health', nextDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01` },
  ];

  for (const r of recurring) {
    await dbInsert('recurring_transactions', {
      id: uuid(),
      user_id: userId,
      description: r.desc,
      amount: r.amount,
      type: 'expense',
      scope: 'personal',
      category_id: r.catId,
      account_id: accountId,
      frequency: r.freq,
      start_date: '2026-01-01',
      next_due_date: r.nextDate,
      is_active: 1,
      auto_add: 0,
      reminder_days_before: 3,
      created_at: nowStr,
      updated_at: nowStr,
    });
  }
};

const insertTx = async (
  userId: string,
  accountId: string,
  type: string,
  scope: string,
  amount: number,
  categoryId: string,
  description: string,
  date: string,
  tags: string[]
): Promise<void> => {
  const now = new Date().toISOString();
  await dbInsert('transactions', {
    id: uuid(),
    user_id: userId,
    account_id: accountId,
    type,
    scope,
    amount: Math.round(amount * 100) / 100,
    currency: 'EUR',
    category_id: categoryId,
    description,
    date,
    tags: JSON.stringify(tags),
    is_recurring: 0,
    created_at: now,
    updated_at: now,
  });
};
