import * as SQLite from 'expo-sqlite';

const DB_NAME = 'mojnovcnik.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
};

// Kreiranje svih tablica
export const initializeDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      pin_hash TEXT,
      biometric_enabled INTEGER DEFAULT 0,
      monthly_income REAL DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      household_id TEXT,
      budget_mode TEXT DEFAULT 'envelope',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      color TEXT DEFAULT '#0F4C3A',
      icon TEXT DEFAULT '🏦',
      is_default INTEGER DEFAULT 0,
      include_in_total INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      to_account_id TEXT,
      type TEXT NOT NULL,
      scope TEXT DEFAULT 'personal',
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      category_id TEXT NOT NULL,
      subcategory_id TEXT,
      description TEXT NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      is_recurring INTEGER DEFAULT 0,
      recurring_id TEXT,
      split_parts TEXT,
      location TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT,
      type TEXT NOT NULL,
      scope TEXT DEFAULT 'personal',
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      subcategory_id TEXT,
      description TEXT NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      next_due_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      auto_add INTEGER DEFAULT 0,
      reminder_days_before INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS budget_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      month TEXT NOT NULL,
      allocated REAL DEFAULT 0,
      spent REAL DEFAULT 0,
      scope TEXT DEFAULT 'personal',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, category_id, month)
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '🎯',
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date TEXT NOT NULL,
      monthly_contribution REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      color TEXT DEFAULT '#D4AF37',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      interest_rate REAL DEFAULT 0,
      minimum_payment REAL DEFAULT 0,
      due_date TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      name_en TEXT,
      emoji TEXT DEFAULT '📌',
      color TEXT DEFAULT '#607D8B',
      type TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_advice (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      is_read INTEGER DEFAULT 0,
      is_dismissed INTEGER DEFAULT 0,
      scope TEXT DEFAULT 'personal',
      action_label TEXT,
      action_route TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Migracija: recurring_transactions bez FK na account_id (ponavljajuća plaćanja ne trebaju račun)
  `);

  // Provjeri treba li migracija za recurring_transactions
  try {
    const tableInfo = await database.getAllAsync(
      "PRAGMA table_info(recurring_transactions)"
    ) as any[];
    const hasAccountNotNull = tableInfo.find(
      (col: any) => col.name === 'account_id' && col.notnull === 1
    );
    if (hasAccountNotNull) {
      await database.execAsync('PRAGMA foreign_keys = OFF;');
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS recurring_transactions_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          account_id TEXT,
          type TEXT NOT NULL,
          scope TEXT DEFAULT 'personal',
          amount REAL NOT NULL,
          category_id TEXT NOT NULL,
          subcategory_id TEXT,
          description TEXT NOT NULL,
          frequency TEXT NOT NULL,
          start_date TEXT,
          end_date TEXT,
          next_due_date TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          auto_add INTEGER DEFAULT 0,
          reminder_days_before INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        INSERT OR IGNORE INTO recurring_transactions_new SELECT * FROM recurring_transactions;
        DROP TABLE recurring_transactions;
        ALTER TABLE recurring_transactions_new RENAME TO recurring_transactions;
      `);
      await database.execAsync('PRAGMA foreign_keys = ON;');
    }
  } catch (_) { /* tablica možda ne postoji još */ }

  await database.execAsync(`
    -- Indeksi za performanse
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date
      ON transactions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(category_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_account
      ON transactions(account_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_budget_items_month
      ON budget_items(user_id, month);
    CREATE INDEX IF NOT EXISTS idx_recurring_next_due
      ON recurring_transactions(next_due_date, is_active);
  `);

  // Migracija: dodaj invite_code u households ako ne postoji
  try {
    const householdInfo = await database.getAllAsync(
      "PRAGMA table_info(households)"
    ) as any[];
    const hasInviteCode = householdInfo.some((col: any) => col.name === 'invite_code');
    if (!hasInviteCode) {
      await database.execAsync('ALTER TABLE households ADD COLUMN invite_code TEXT UNIQUE');
    }
  } catch (_) { /* tablica možda ne postoji još */ }

  // Migracija: app_settings tablica
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  } catch (_) {}

  // Migracija: budget_presets tablica
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS budget_presets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        allocations TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  } catch (_) { /* tablica možda već postoji */ }

  // Migracija: dodaj to_account_id u transactions za transfer podršku
  try {
    const txInfo = await database.getAllAsync(
      "PRAGMA table_info(transactions)"
    ) as any[];
    const hasToAccountId = txInfo.some((col: any) => col.name === 'to_account_id');
    if (!hasToAccountId) {
      await database.execAsync('ALTER TABLE transactions ADD COLUMN to_account_id TEXT');
    }
  } catch (_) { /* tablica možda ne postoji još */ }
};

// Pomoćne funkcije za CRUD operacije
export const dbInsert = async (
  table: string,
  data: Record<string, unknown>
): Promise<void> => {
  const database = await getDatabase();
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = Object.values(data);

  await database.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    values as (string | number | null)[]
  );
};

export const dbUpdate = async (
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> => {
  const database = await getDatabase();
  const keys = Object.keys(data);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];

  await database.runAsync(
    `UPDATE ${table} SET ${setClause} WHERE id = ?`,
    values as (string | number | null)[]
  );
};

export const dbDelete = async (table: string, id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
};

export const dbGetAll = async <T>(
  table: string,
  where?: string,
  params?: (string | number | null)[]
): Promise<T[]> => {
  const database = await getDatabase();
  const query = where
    ? `SELECT * FROM ${table} WHERE ${where}`
    : `SELECT * FROM ${table}`;
  return database.getAllAsync<T>(query, params || []);
};

export const dbGetOne = async <T>(
  table: string,
  where: string,
  params: (string | number | null)[]
): Promise<T | null> => {
  const database = await getDatabase();
  return database.getFirstAsync<T>(
    `SELECT * FROM ${table} WHERE ${where}`,
    params
  );
};

export const dbQuery = async <T>(
  query: string,
  params?: (string | number | null)[]
): Promise<T[]> => {
  const database = await getDatabase();
  return database.getAllAsync<T>(query, params || []);
};
