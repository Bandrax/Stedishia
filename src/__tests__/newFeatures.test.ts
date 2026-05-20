import { autoDetectCategory } from '../services/autoCategory';
import {
  formatAmount,
  formatAmountShort,
  getCurrentMonth,
} from '../utils/formatters';

// ========== Auto Category Detection ==========

describe('autoDetectCategory', () => {
  it('should detect grocery stores', () => {
    expect(autoDetectCategory('Konzum - tjedna kupovina')?.categoryId).toBe('food');
    expect(autoDetectCategory('Lidl namirnice')?.categoryId).toBe('food');
    expect(autoDetectCategory('Spar kupovina')?.categoryId).toBe('food');
    expect(autoDetectCategory('Kaufland')?.categoryId).toBe('food');
  });

  it('should detect restaurants', () => {
    expect(autoDetectCategory('Pizza Hut')?.categoryId).toBe('food');
    expect(autoDetectCategory('Restoran Vinodol')?.categoryId).toBe('food');
    expect(autoDetectCategory('McDonalds')?.categoryId).toBe('food');
  });

  it('should detect delivery services', () => {
    expect(autoDetectCategory('Wolt - dostava')?.categoryId).toBe('food');
    expect(autoDetectCategory('Glovo narudžba')?.categoryId).toBe('food');
  });

  it('should detect transport', () => {
    expect(autoDetectCategory('Gorivo INA')?.categoryId).toBe('transport');
    expect(autoDetectCategory('ZET mjesečna')?.categoryId).toBe('transport');
    expect(autoDetectCategory('Uber vožnja')?.categoryId).toBe('transport');
    expect(autoDetectCategory('Parking garaža')?.categoryId).toBe('transport');
  });

  it('should detect utilities', () => {
    expect(autoDetectCategory('HEP struja')?.categoryId).toBe('utilities');
    expect(autoDetectCategory('Voda - vodovod')?.categoryId).toBe('utilities');
    expect(autoDetectCategory('A1 Internet')?.categoryId).toBe('utilities');
  });

  it('should detect housing', () => {
    expect(autoDetectCategory('Najam stana')?.categoryId).toBe('housing');
    expect(autoDetectCategory('IKEA namještaj')?.categoryId).toBe('housing');
  });

  it('should detect entertainment and subscriptions', () => {
    expect(autoDetectCategory('Netflix')?.categoryId).toBe('entertainment');
    expect(autoDetectCategory('Spotify Premium')?.categoryId).toBe('entertainment');
    expect(autoDetectCategory('Cinestar - kino')?.categoryId).toBe('entertainment');
  });

  it('should detect health', () => {
    expect(autoDetectCategory('Ljekarna')?.categoryId).toBe('health');
    expect(autoDetectCategory('Fitness centar')?.categoryId).toBe('health');
  });

  it('should detect salary/income', () => {
    expect(autoDetectCategory('Plaća')?.categoryId).toBe('salary');
    expect(autoDetectCategory('Freelance projekt')?.categoryId).toBe('freelance');
  });

  it('should detect clothing', () => {
    expect(autoDetectCategory('Zara - odjeća')?.categoryId).toBe('clothing');
    expect(autoDetectCategory('H&M shopping')?.categoryId).toBe('clothing');
  });

  it('should return null for unknown descriptions', () => {
    expect(autoDetectCategory('XYZ123')).toBeNull();
    expect(autoDetectCategory('')).toBeNull();
    expect(autoDetectCategory('asdf')).toBeNull();
  });

  it('should be case insensitive', () => {
    expect(autoDetectCategory('KONZUM')?.categoryId).toBe('food');
    expect(autoDetectCategory('netflix')?.categoryId).toBe('entertainment');
    expect(autoDetectCategory('INA GORIVO')?.categoryId).toBe('transport');
  });

  it('should return subcategory when available', () => {
    const result = autoDetectCategory('Konzum');
    expect(result?.subcategoryId).toBe('groceries');

    const fuel = autoDetectCategory('INA gorivo');
    expect(fuel?.subcategoryId).toBe('fuel');
  });

  it('should return confidence of 0.8', () => {
    const result = autoDetectCategory('Konzum');
    expect(result?.confidence).toBe(0.8);
  });

  it('should detect used item purchases', () => {
    expect(autoDetectCategory('Polovni auto')?.categoryId).toBe('used_purchase');
    expect(autoDetectCategory('Rabljeni monitor')?.subcategoryId).toBe('used_electronics');
    expect(autoDetectCategory('Second hand odjeća')?.categoryId).toBe('used_purchase');
    expect(autoDetectCategory('Kupljeno polovno')?.categoryId).toBe('used_purchase');
  });

  it('should detect used item sales', () => {
    expect(autoDetectCategory('Prodao laptop')?.categoryId).toBe('used_sale');
    expect(autoDetectCategory('Prodaja auta')?.subcategoryId).toBe('sell_vehicle');
    expect(autoDetectCategory('Prodala slušalice')?.categoryId).toBe('used_sale');
    expect(autoDetectCategory('Sold monitor')?.categoryId).toBe('used_sale');
  });
});

// ========== CSV Export Format ==========

describe('CSV escaping logic', () => {
  // Test the escaping pattern used in exportService
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  it('should not escape simple strings', () => {
    expect(escapeCSV('hello')).toBe('hello');
    expect(escapeCSV('test123')).toBe('test123');
  });

  it('should escape strings with commas', () => {
    expect(escapeCSV('hello, world')).toBe('"hello, world"');
  });

  it('should escape strings with quotes', () => {
    expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
  });

  it('should escape strings with newlines', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
  });
});

// ========== Subscription Yearly Calculations ==========

describe('subscription yearly amount calculations', () => {
  const getYearlyAmount = (amount: number, frequency: string): number => {
    switch (frequency) {
      case 'weekly': return amount * 52;
      case 'biweekly': return amount * 26;
      case 'monthly': return amount * 12;
      case 'quarterly': return amount * 4;
      case 'yearly': return amount;
      default: return amount * 12;
    }
  };

  it('should calculate monthly to yearly', () => {
    expect(getYearlyAmount(25, 'monthly')).toBe(300);
    expect(getYearlyAmount(12, 'monthly')).toBe(144);
  });

  it('should calculate weekly to yearly', () => {
    expect(getYearlyAmount(10, 'weekly')).toBe(520);
  });

  it('should calculate biweekly to yearly', () => {
    expect(getYearlyAmount(50, 'biweekly')).toBe(1300);
  });

  it('should calculate quarterly to yearly', () => {
    expect(getYearlyAmount(30, 'quarterly')).toBe(120);
  });

  it('should keep yearly as is', () => {
    expect(getYearlyAmount(99, 'yearly')).toBe(99);
  });
});

// ========== Additional Formatter Edge Cases ==========

describe('formatAmount edge cases', () => {
  it('should handle 0', () => {
    const result = formatAmount(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  it('should handle negative amounts', () => {
    const result = formatAmount(-500);
    expect(result).toContain('500');
  });

  it('should handle large amounts', () => {
    const result = formatAmount(1000000);
    expect(result).toContain('€');
  });
});

describe('formatAmountShort edge cases', () => {
  it('should handle 0', () => {
    expect(formatAmountShort(0)).toBe('0 €');
  });

  it('should handle exact thousands', () => {
    expect(formatAmountShort(1000)).toBe('1.0k €');
  });

  it('should handle large amounts', () => {
    expect(formatAmountShort(50000)).toBe('50.0k €');
  });
});

describe('getCurrentMonth edge cases', () => {
  it('should return current year', () => {
    const month = getCurrentMonth();
    const year = new Date().getFullYear();
    expect(month.startsWith(String(year))).toBe(true);
  });

  it('should have 7 chars', () => {
    expect(getCurrentMonth().length).toBe(7);
  });
});
