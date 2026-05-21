import i18n from '../locales/i18n';
import { dbQuery } from './database';
import { getCurrentMonth } from '../utils';
import { getMonthlyStats, getTopExpenses, getBudgetProgress } from './dashboardService';
import { getEmergencyFundCoverage, getNetWorth } from './goalService';
import { getSnapshot, getPreviousMonth } from './monthTransitionService';
import { detectSubscriptions } from './debtService';
import { getDebts } from './debtService';
import type { AdviceCategory, AdvicePriority } from '../types';

export interface Advice {
  id: string;
  title: string;
  message: string;
  category: AdviceCategory;
  priority: AdvicePriority;
  emoji: string;
  actionLabel?: string;
  actionRoute?: string;
}

// Generate personalized advice based on financial data
export const generateAdvice = async (userId: string): Promise<Advice[]> => {
  const advice: Advice[] = [];
  const month = getCurrentMonth();

  try {
    const stats = await getMonthlyStats(userId, month);
    const topExpenses = await getTopExpenses(userId, month, 5);
    const budgetProgress = await getBudgetProgress(userId, month);
    const debts = await getDebts(userId);
    const subscriptions = await detectSubscriptions(userId);
    const netWorthData = await getNetWorth(userId);

    let emergencyMonths = 0;
    if (stats.expenses > 0) {
      emergencyMonths = await getEmergencyFundCoverage(userId, stats.expenses);
    }

    const savingsRate = stats.income > 0 ? ((stats.income - stats.expenses) / stats.income) * 100 : 0;

    // === SPENDING ANALYSIS ===

    if (stats.income > 0 && stats.expenses > stats.income) {
      const overBy = stats.expenses - stats.income;
      advice.push({
        id: 'overspending',
        title: i18n.t('advisor.advice.overspendingTitle'),
        message: i18n.t('advisor.advice.overspendingMsg', { amount: overBy.toFixed(0) }),
        category: 'spending',
        priority: 'high',
        emoji: '🚨',
        actionLabel: i18n.t('advisor.advice.overspendingAction'),
        actionRoute: 'Transactions',
      });
    }

    // Savings rate
    if (savingsRate > 0 && savingsRate < 10) {
      advice.push({
        id: 'low_savings',
        title: i18n.t('advisor.advice.lowSavingsTitle'),
        message: i18n.t('advisor.advice.lowSavingsMsg', { rate: savingsRate.toFixed(0) }),
        category: 'saving',
        priority: 'medium',
        emoji: '💡',
      });
    } else if (savingsRate >= 20) {
      advice.push({
        id: 'great_savings',
        title: i18n.t('advisor.advice.greatSavingsTitle'),
        message: i18n.t('advisor.advice.greatSavingsMsg', { rate: savingsRate.toFixed(0) }),
        category: 'saving',
        priority: 'low',
        emoji: '🌟',
      });
    }

    // === BUDGET ANALYSIS ===

    const overBudgetCategories = budgetProgress.filter((b) => b.spent > b.allocated && b.allocated > 0);
    if (overBudgetCategories.length > 0) {
      advice.push({
        id: 'over_budget',
        title: i18n.t('advisor.advice.overBudgetTitle', { count: overBudgetCategories.length }),
        message: i18n.t('advisor.advice.overBudgetMsg', { count: overBudgetCategories.length }),
        category: 'budget',
        priority: 'medium',
        emoji: '📊',
        actionLabel: i18n.t('advisor.advice.overBudgetAction'),
        actionRoute: 'Budget',
      });
    }

    const nearBudgetCategories = budgetProgress.filter(
      (b) => b.allocated > 0 && b.spent / b.allocated >= 0.8 && b.spent <= b.allocated
    );
    if (nearBudgetCategories.length > 0) {
      advice.push({
        id: 'near_budget',
        title: i18n.t('advisor.advice.nearBudgetTitle'),
        message: i18n.t('advisor.advice.nearBudgetMsg', { count: nearBudgetCategories.length }),
        category: 'budget',
        priority: 'low',
        emoji: '⚠️',
      });
    }

    // === DEBT ANALYSIS ===

    const activeDebts = debts.filter((d) => d.remainingAmount > 0);
    if (activeDebts.length > 0) {
      const totalDebt = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
      const highInterest = activeDebts.filter((d) => d.interestRate > 10);

      if (highInterest.length > 0) {
        advice.push({
          id: 'high_interest_debt',
          title: i18n.t('advisor.advice.highInterestTitle'),
          message: i18n.t('advisor.advice.highInterestMsg', { count: highInterest.length }),
          category: 'general',
          priority: 'high',
          emoji: '🔥',
          actionLabel: i18n.t('advisor.advice.highInterestAction'),
          actionRoute: 'Accounts',
        });
      }

      if (stats.income > 0) {
        const debtToIncomeRatio = (activeDebts.reduce((s, d) => s + d.minimumPayment, 0) / stats.income) * 100;
        if (debtToIncomeRatio > 40) {
          advice.push({
            id: 'debt_burden',
            title: i18n.t('advisor.advice.debtBurdenTitle'),
            message: i18n.t('advisor.advice.debtBurdenMsg', { ratio: debtToIncomeRatio.toFixed(0) }),
            category: 'general',
            priority: 'high',
            emoji: '⚡',
          });
        }
      }
    }

    // === SUBSCRIPTION ANALYSIS ===

    if (subscriptions.length > 0) {
      const totalMonthlySubs = subscriptions.reduce((s, sub) => s + sub.yearlyTotal / 12, 0);
      const totalYearlySubs = subscriptions.reduce((s, sub) => s + sub.yearlyTotal, 0);

      if (totalMonthlySubs > 100) {
        advice.push({
          id: 'high_subscriptions',
          title: i18n.t('advisor.advice.highSubsTitle'),
          message: i18n.t('advisor.advice.highSubsMsg', {
            monthly: totalMonthlySubs.toFixed(0),
            yearly: totalYearlySubs.toFixed(0),
          }),
          category: 'subscription',
          priority: 'medium',
          emoji: '🔄',
          actionLabel: i18n.t('advisor.advice.highSubsAction'),
          actionRoute: 'RecurringPayments',
        });
      } else if (subscriptions.length > 5) {
        advice.push({
          id: 'many_subscriptions',
          title: i18n.t('advisor.advice.manySubsTitle', { count: subscriptions.length }),
          message: i18n.t('advisor.advice.manySubsMsg', { count: subscriptions.length }),
          category: 'subscription',
          priority: 'low',
          emoji: '📋',
        });
      }
    }

    // === EMERGENCY FUND ===

    if (emergencyMonths < 1) {
      advice.push({
        id: 'no_emergency_fund',
        title: i18n.t('advisor.advice.noEmergencyTitle'),
        message: i18n.t('advisor.advice.noEmergencyMsg'),
        category: 'saving',
        priority: 'high',
        emoji: '🛡️',
        actionLabel: i18n.t('advisor.advice.noEmergencyAction'),
        actionRoute: 'Goals',
      });
    } else if (emergencyMonths < 3) {
      advice.push({
        id: 'low_emergency_fund',
        title: i18n.t('advisor.advice.lowEmergencyTitle'),
        message: i18n.t('advisor.advice.lowEmergencyMsg', { months: emergencyMonths.toFixed(1) }),
        category: 'saving',
        priority: 'medium',
        emoji: '🏗️',
      });
    } else if (emergencyMonths >= 6) {
      advice.push({
        id: 'strong_emergency_fund',
        title: i18n.t('advisor.advice.strongEmergencyTitle'),
        message: i18n.t('advisor.advice.strongEmergencyMsg', { months: emergencyMonths.toFixed(1) }),
        category: 'saving',
        priority: 'low',
        emoji: '🛡️✨',
      });
    }

    // === NET WORTH ===

    if (netWorthData.netWorth < 0) {
      advice.push({
        id: 'negative_net_worth',
        title: i18n.t('advisor.advice.negativeNetWorthTitle'),
        message: i18n.t('advisor.advice.negativeNetWorthMsg', {
          liabilities: netWorthData.liabilities.toFixed(0),
          assets: netWorthData.assets.toFixed(0),
        }),
        category: 'general',
        priority: 'medium',
        emoji: '📉',
      });
    }

    // === POSITIVE ADVICE ===

    if (advice.length === 0 || advice.every((a) => a.priority === 'low')) {
      advice.push({
        id: 'all_good',
        title: i18n.t('advisor.advice.allGoodTitle'),
        message: i18n.t('advisor.advice.allGoodMsg'),
        category: 'general',
        priority: 'low',
        emoji: '🌈',
      });
    }
    // === MONTH-TO-MONTH COMPARISON ===
    const prevMonth = getPreviousMonth(month);
    const prevSnapshot = await getSnapshot(userId, prevMonth);
    if (prevSnapshot && prevSnapshot.totalExpenses > 0 && stats.expenses > 0) {
      const expenseChangePercent = ((stats.expenses - prevSnapshot.totalExpenses) / prevSnapshot.totalExpenses) * 100;

      if (expenseChangePercent > 20) {
        advice.push({
          id: 'monthly_expense_up',
          title: i18n.t('advisor.advice.monthlyExpenseUpTitle'),
          message: i18n.t('advisor.advice.monthlyExpenseUpMsg', { percent: Math.round(expenseChangePercent) }),
          category: 'spending',
          priority: 'high',
          emoji: '📈',
        });
      } else if (expenseChangePercent < -10) {
        advice.push({
          id: 'monthly_expense_down',
          title: i18n.t('advisor.advice.monthlyExpenseDownTitle'),
          message: i18n.t('advisor.advice.monthlyExpenseDownMsg', { percent: Math.round(Math.abs(expenseChangePercent)) }),
          category: 'spending',
          priority: 'low',
          emoji: '📉',
        });
      }

      if (prevSnapshot.totalIncome > 0 && stats.income > 0) {
        const incomeChange = ((stats.income - prevSnapshot.totalIncome) / prevSnapshot.totalIncome) * 100;
        if (incomeChange < -20) {
          advice.push({
            id: 'monthly_income_drop',
            title: i18n.t('advisor.advice.monthlyIncomeDropTitle'),
            message: i18n.t('advisor.advice.monthlyIncomeDropMsg', { percent: Math.round(Math.abs(incomeChange)) }),
            category: 'general',
            priority: 'medium',
            emoji: '⚠️',
          });
        }
      }

      // Usporedba štednje
      const prevSavingsRate = prevSnapshot.totalIncome > 0
        ? ((prevSnapshot.totalIncome - prevSnapshot.totalExpenses) / prevSnapshot.totalIncome) * 100
        : 0;
      if (savingsRate > 0 && prevSavingsRate > 0 && savingsRate > prevSavingsRate + 5) {
        advice.push({
          id: 'monthly_savings_improved',
          title: i18n.t('advisor.advice.monthlySavingsImprovedTitle'),
          message: i18n.t('advisor.advice.monthlySavingsImprovedMsg', {
            current: Math.round(savingsRate),
            previous: Math.round(prevSavingsRate),
          }),
          category: 'saving',
          priority: 'low',
          emoji: '🎉',
        });
      }
    }

  } catch (error) {
    console.error('Advice generation error:', error);
    advice.push({
      id: 'error',
      title: i18n.t('advisor.advice.errorTitle'),
      message: i18n.t('advisor.advice.errorMsg'),
      category: 'general',
      priority: 'low',
      emoji: '📊',
    });
  }

  // Sort by priority
  const priorityOrder: Record<AdvicePriority, number> = { high: 0, medium: 1, low: 2 };
  advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return advice;
};

// Weekly check-in questions
export const getWeeklyCheckIn = (): Array<{
  question: string;
  emoji: string;
  type: 'yes_no' | 'scale' | 'reflection';
}> => {
  const weekOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24 * 7)
  );

  const allCheckIns = [
    [
      { question: i18n.t('advisor.checkin.w0q1'), emoji: '💰', type: 'yes_no' as const },
      { question: i18n.t('advisor.checkin.w0q2'), emoji: '⭐', type: 'scale' as const },
      { question: i18n.t('advisor.checkin.w0q3'), emoji: '🧠', type: 'reflection' as const },
    ],
    [
      { question: i18n.t('advisor.checkin.w1q1'), emoji: '🛍️', type: 'yes_no' as const },
      { question: i18n.t('advisor.checkin.w1q2'), emoji: '👁️', type: 'scale' as const },
      { question: i18n.t('advisor.checkin.w1q3'), emoji: '🔄', type: 'reflection' as const },
    ],
    [
      { question: i18n.t('advisor.checkin.w2q1'), emoji: '🐷', type: 'yes_no' as const },
      { question: i18n.t('advisor.checkin.w2q2'), emoji: '🛡️', type: 'scale' as const },
      { question: i18n.t('advisor.checkin.w2q3'), emoji: '🏆', type: 'reflection' as const },
    ],
    [
      { question: i18n.t('advisor.checkin.w3q1'), emoji: '📋', type: 'yes_no' as const },
      { question: i18n.t('advisor.checkin.w3q2'), emoji: '🎯', type: 'scale' as const },
      { question: i18n.t('advisor.checkin.w3q3'), emoji: '🎯', type: 'reflection' as const },
    ],
  ];

  return allCheckIns[weekOfYear % allCheckIns.length];
};

// Education articles
export const getEducationArticles = (): Array<{
  id: string;
  title: string;
  emoji: string;
  summary: string;
  content: string;
  readTimeMin: number;
}> => [
  {
    id: 'budgeting_101',
    title: i18n.t('advisor.education.budgetTitle'),
    emoji: '📒',
    summary: i18n.t('advisor.education.budgetSummary'),
    readTimeMin: 3,
    content: i18n.t('advisor.education.budgetContent'),
  },
  {
    id: 'emergency_fund',
    title: i18n.t('advisor.education.emergencyTitle'),
    emoji: '🛡️',
    summary: i18n.t('advisor.education.emergencySummary'),
    readTimeMin: 3,
    content: i18n.t('advisor.education.emergencyContent'),
  },
  {
    id: 'compound_interest',
    title: i18n.t('advisor.education.compoundTitle'),
    emoji: '📈',
    summary: i18n.t('advisor.education.compoundSummary'),
    readTimeMin: 4,
    content: i18n.t('advisor.education.compoundContent'),
  },
  {
    id: 'debt_strategies',
    title: i18n.t('advisor.education.debtTitle'),
    emoji: '⛷️',
    summary: i18n.t('advisor.education.debtSummary'),
    readTimeMin: 4,
    content: i18n.t('advisor.education.debtContent'),
  },
  {
    id: 'lifestyle_inflation',
    title: i18n.t('advisor.education.lifestyleTitle'),
    emoji: '🎈',
    summary: i18n.t('advisor.education.lifestyleSummary'),
    readTimeMin: 3,
    content: i18n.t('advisor.education.lifestyleContent'),
  },
];

// Financial glossary
export const getFinancialGlossary = (): Array<{
  term: string;
  definition: string;
  emoji: string;
}> => [
  {
    term: i18n.t('advisor.glossary.budgetTerm'),
    definition: i18n.t('advisor.glossary.budgetDef'),
    emoji: '📒',
  },
  {
    term: i18n.t('advisor.glossary.netWorthTerm'),
    definition: i18n.t('advisor.glossary.netWorthDef'),
    emoji: '📊',
  },
  {
    term: i18n.t('advisor.glossary.savingsRateTerm'),
    definition: i18n.t('advisor.glossary.savingsRateDef'),
    emoji: '🐷',
  },
  {
    term: i18n.t('advisor.glossary.emergencyFundTerm'),
    definition: i18n.t('advisor.glossary.emergencyFundDef'),
    emoji: '🛡️',
  },
  {
    term: i18n.t('advisor.glossary.compoundInterestTerm'),
    definition: i18n.t('advisor.glossary.compoundInterestDef'),
    emoji: '📈',
  },
  {
    term: i18n.t('advisor.glossary.liquidityTerm'),
    definition: i18n.t('advisor.glossary.liquidityDef'),
    emoji: '💧',
  },
  {
    term: i18n.t('advisor.glossary.inflationTerm'),
    definition: i18n.t('advisor.glossary.inflationDef'),
    emoji: '🎈',
  },
  {
    term: i18n.t('advisor.glossary.amortizationTerm'),
    definition: i18n.t('advisor.glossary.amortizationDef'),
    emoji: '📋',
  },
  {
    term: i18n.t('advisor.glossary.diversificationTerm'),
    definition: i18n.t('advisor.glossary.diversificationDef'),
    emoji: '🥚',
  },
  {
    term: i18n.t('advisor.glossary.passiveIncomeTerm'),
    definition: i18n.t('advisor.glossary.passiveIncomeDef'),
    emoji: '😴',
  },
  {
    term: i18n.t('advisor.glossary.cashFlowTerm'),
    definition: i18n.t('advisor.glossary.cashFlowDef'),
    emoji: '💸',
  },
  {
    term: i18n.t('advisor.glossary.roiTerm'),
    definition: i18n.t('advisor.glossary.roiDef'),
    emoji: '🎯',
  },
];
