import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { hr, enUS } from 'date-fns/locale';

// Formatiranje iznosa s valutom
export const formatAmount = (
  amount: number,
  currency: string = 'EUR',
  showSign: boolean = false
): string => {
  const formatted = new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency,
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
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}k €`;
  }
  return `${amount.toFixed(0)} €`;
};

// Formatiranje datuma
export const formatDate = (
  dateStr: string,
  formatStr: string = 'd. MMM yyyy.',
  locale: string = 'hr'
): string => {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(date, formatStr, {
    locale: locale === 'hr' ? hr : enUS,
  });
};

// Relativan datum (Danas, Jučer, ili datum)
export const formatRelativeDate = (dateStr: string, locale: string = 'hr'): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return locale === 'hr' ? 'Danas' : 'Today';
  if (isYesterday(date)) return locale === 'hr' ? 'Jučer' : 'Yesterday';
  return formatDate(dateStr, 'd. MMM', locale);
};

// Formatiranje postotka
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

// Formatiranje mjeseca (npr. "Svibanj 2026")
export const formatMonth = (monthStr: string, locale: string = 'hr'): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, 'LLLL yyyy', {
    locale: locale === 'hr' ? hr : enUS,
  });
};

// Trenutni mjesec u YYYY-MM formatu
export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
