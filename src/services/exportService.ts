import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import { dbQuery } from './database';
import { getCategoryInfo } from './dashboardService';
import { getMonthlyOverview } from './reportService';

// Escape CSV field (handle commas, quotes, newlines)
const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

// Export transactions as CSV
export const exportTransactionsCSV = async (
  userId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<string> => {
  let query = `
    SELECT t.date, t.type, t.category_id, t.description, t.amount, t.tags,
           a.name as account_name
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = ?
  `;
  const params: any[] = [userId];

  if (dateFrom) {
    query += ' AND t.date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND t.date <= ?';
    params.push(dateTo);
  }

  query += ' ORDER BY t.date DESC';

  const transactions = await dbQuery<{
    date: string;
    type: string;
    category_id: string;
    description: string;
    amount: number;
    tags: string;
    account_name: string | null;
  }>(query, params);

  const header = 'Date,Type,Category,Description,Amount,Account,Tags';
  const rows = transactions.map((t) => {
    const categoryInfo = getCategoryInfo(t.category_id);
    const categoryName = categoryInfo?.name ?? t.category_id;
    let tags = '';
    try {
      const parsed = JSON.parse(t.tags || '[]');
      tags = Array.isArray(parsed) ? parsed.join('; ') : '';
    } catch {
      tags = '';
    }

    return [
      escapeCSV(t.date),
      escapeCSV(t.type),
      escapeCSV(categoryName),
      escapeCSV(t.description),
      t.amount.toFixed(2),
      escapeCSV(t.account_name ?? ''),
      escapeCSV(tags),
    ].join(',');
  });

  return [header, ...rows].join('\n');
};

// Export monthly report as CSV
export const exportMonthlyReportCSV = async (
  userId: string,
  months: number = 12
): Promise<string> => {
  const data = await getMonthlyOverview(userId, months);

  const header = 'Month,Income,Expenses,Savings,SavingsRate';
  const rows = data.map((d) => {
    const savingsRate = d.income > 0
      ? ((d.savings / d.income) * 100).toFixed(1)
      : '0.0';

    return [
      d.month,
      d.income.toFixed(2),
      d.expenses.toFixed(2),
      d.savings.toFixed(2),
      savingsRate,
    ].join(',');
  });

  return [header, ...rows].join('\n');
};

// Save CSV to file and share
export const shareCSVFile = async (
  content: string,
  filename: string
): Promise<void> => {
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(content);

  const filePath = file.uri;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: filename,
    });
  }
};
