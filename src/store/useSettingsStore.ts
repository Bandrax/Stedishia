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

export type IconStyle = 'classic' | 'modern';

interface SettingsState {
  currency: string;
  iconStyle: IconStyle;
  setCurrency: (code: string) => Promise<void>;
  setIconStyle: (style: IconStyle) => Promise<void>;
  loadSettings: () => Promise<void>;
}

// Module-level variables accessible by formatters and components (non-React code)
let _currentCurrency = 'EUR';
let _currentIconStyle: IconStyle = 'classic';

export const getCurrentCurrency = () => _currentCurrency;
export const getCurrentIconStyle = () => _currentIconStyle;

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'EUR',
  iconStyle: 'classic',

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

  setIconStyle: async (style: IconStyle) => {
    _currentIconStyle = style;
    set({ iconStyle: style });
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('icon_style', ?)`,
        [style]
      );
    } catch (_) {}
  },

  loadSettings: async () => {
    try {
      const rows = await dbQuery<{ key: string; value: string }>(
        `SELECT key, value FROM app_settings WHERE key IN ('currency', 'icon_style')`,
        []
      );
      for (const row of rows) {
        if (row.key === 'currency' && row.value) {
          _currentCurrency = row.value;
          set({ currency: row.value });
        }
        if (row.key === 'icon_style' && (row.value === 'classic' || row.value === 'modern')) {
          _currentIconStyle = row.value;
          set({ iconStyle: row.value });
        }
      }
    } catch (_) {}
  },
}));
