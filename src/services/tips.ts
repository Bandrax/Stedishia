// Daily financial tips system — all strings served via i18n
import i18n from '../locales/i18n';

// Returns the tip of the day based on the date (same tip all day)
export const getDailyTip = (): string => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const tipsList = i18n.t('tips.list', { returnObjects: true }) as string[];
  const index = dayOfYear % tipsList.length;
  return tipsList[index];
};

// Personalized tips input type
export interface PersonalizedTipInput {
  monthlyIncome: number;
  totalExpenses: number;
  topCategory?: { name: string; amount: number; percentOfTotal: number };
  emergencyFundMonths?: number;
  subscriptionTotal?: number;
  categoryOverBudget?: string[];
  savingsRate?: number;
}

export const getPersonalizedTips = (input: PersonalizedTipInput): string[] => {
  const tips: string[] = [];

  // Savings rate
  if (input.monthlyIncome > 0) {
    const savingsRate = ((input.monthlyIncome - input.totalExpenses) / input.monthlyIncome) * 100;
    if (savingsRate < 0) {
      tips.push(i18n.t('advisor.personalizedTips.overspending'));
    } else if (savingsRate < 10) {
      tips.push(i18n.t('advisor.personalizedTips.lowSavingsRate', { rate: savingsRate.toFixed(0) }));
    } else if (savingsRate >= 20) {
      tips.push(i18n.t('advisor.personalizedTips.greatSavingsRate', { rate: savingsRate.toFixed(0) }));
    }
  }

  // Top category
  if (input.topCategory && input.topCategory.percentOfTotal > 40) {
    tips.push(
      i18n.t('advisor.personalizedTips.topCategory', {
        name: input.topCategory.name,
        percent: input.topCategory.percentOfTotal.toFixed(0),
      })
    );
  }

  // Emergency fund
  if (input.emergencyFundMonths !== undefined && input.emergencyFundMonths < 3) {
    tips.push(
      i18n.t('advisor.personalizedTips.lowEmergencyFund', {
        months: input.emergencyFundMonths.toFixed(1),
      })
    );
  }

  // Subscriptions
  if (input.subscriptionTotal && input.subscriptionTotal > 50) {
    tips.push(
      i18n.t('advisor.personalizedTips.highSubscriptions', {
        amount: input.subscriptionTotal.toFixed(0),
        yearly: (input.subscriptionTotal * 12).toFixed(0),
      })
    );
  }

  // Over budget categories
  if (input.categoryOverBudget && input.categoryOverBudget.length > 0) {
    const categories = input.categoryOverBudget.join(', ');
    tips.push(i18n.t('advisor.personalizedTips.overBudget', { categories }));
  }

  return tips;
};
