import { create } from 'zustand';
import { dbQuery, getDatabase } from '../services/database';

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'HRK', symbol: 'kn', name: 'Kuna (legacy)' },
  { code: 'BAM', symbol: 'KM', name: 'Konvertibilna marka' },
  { code: 'RSD', symbol: 'din.', name: 'Serbian Dinar' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
] as const;

interface SettingsState {
  currency: string;
  setCurrency: (code: string) => Promise<void>;
  loadSettings: () => Promise<void>;
}

// Module-level variable accessible by formatters (non-React code)
let _currentCurrency = 'EUR';

export const getCurrentCurrency = () => _currentCurrency;

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'EUR',

  setCurrency: async (code: string) => {
    _currentCurrency = code;
    set({ currency: code });
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('currency', ?)`,
        [code]
      );
    } catch (_) {}
  },

  loadSettings: async () => {
    try {
      const rows = await dbQuery<{ value: string }>(
        `SELECT value FROM app_settings WHERE key = 'currency'`,
        []
      );
      if (rows.length > 0 && rows[0].value) {
        _currentCurrency = rows[0].value;
        set({ currency: rows[0].value });
      }
    } catch (_) {}
  },
}));
