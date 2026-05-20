import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { hr, enUS } from 'date-fns/locale';
import i18n from '../locales/i18n';
import { getCurrentCurrency } from '../store/useSettingsStore';

// Formatiranje iznosa s valutom
export const formatAmount = (
  amount: number,
  currency?: string,
  showSign: boolean = false
): string => {
  const cur = currency || getCurrentCurrency();
  const locale = i18n.language === 'en' ? 'en-US' : 'hr-HR';
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
};

// Kratki format iznosa (npr. 1.5k, 12.3k)
export const formatAmountShort = (amount: number): string => {
  const cur = getCurrentCurrency();
  const symbol = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur;
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}k ${symbol}`;
  }
  return `${amount.toFixed(0)} ${symbol}`;
};

// Formatiranje datuma
export const formatDate = (
  dateStr: string,
  formatStr: string = 'd. MMM yyyy.',
  locale?: string
): string => {
  const lang = locale || i18n.language;
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(date, formatStr, {
    locale: lang === 'hr' ? hr : enUS,
  });
};

// Relativan datum (Danas, Jučer, ili datum)
export const formatRelativeDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return i18n.t('common.today');
  if (isYesterday(date)) return i18n.t('common.yesterday');
  return formatDate(dateStr, 'd. MMM');
};

// Formatiranje postotka
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

// Formatiranje mjeseca (npr. "Svibanj 2026")
export const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, 'LLLL yyyy', {
    locale: i18n.language === 'hr' ? hr : enUS,
  });
};

// Trenutni mjesec u YYYY-MM formatu
export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
