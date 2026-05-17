import {
  calculateMonthsToGoal,
  calculateMonthlyNeeded,
} from '../services/goalService';

import {
  calculateAmortization,
  calculateTotalInterest,
  getSnowballOrder,
  getAvalancheOrder,
  compareStrategies,
} from '../services/debtService';

import {
  formatAmount,
  formatAmountShort,
  formatPercentage,
  getCurrentMonth,
} from '../utils/formatters';

import { getPersonalizedTips } from '../services/tips';

// ========== Goal Calculations ==========

describe('calculateMonthsToGoal', () => {
  it('should return 0 when already reached', () => {
    expect(calculateMonthsToGoal(1000, 1000, 100)).toBe(0);
    expect(calculateMonthsToGoal(1000, 1500, 100)).toBe(0);
  });

  it('should return Infinity when no contribution', () => {
    expect(calculateMonthsToGoal(1000, 0, 0)).toBe(Infinity);
    expect(calculateMonthsToGoal(1000, 0, -10)).toBe(Infinity);
  });

  it('should calculate months correctly', () => {
    expect(calculateMonthsToGoal(1000, 0, 200)).toBe(5);
    expect(calculateMonthsToGoal(1000, 500, 100)).toBe(5);
    expect(calculateMonthsToGoal(1000, 0, 300)).toBe(4); // ceil(3.33)
  });
});

describe('calculateMonthlyNeeded', () => {
  it('should return 0 when already reached', () => {
    expect(calculateMonthlyNeeded(1000, 1000, '2030-01-01')).toBe(0);
  });

  it('should return remaining when deadline passed', () => {
    expect(calculateMonthlyNeeded(1000, 0, '2020-01-01')).toBe(1000);
  });

  it('should calculate monthly amount needed', () => {
    const target = new Date();
    target.setMonth(target.getMonth() + 10);
    const result = calculateMonthlyNeeded(1000, 0, target.toISOString());
    expect(result).toBe(100); // 1000 / 10
  });
});

// ========== Debt Calculations ==========

describe('calculateAmortization', () => {
  it('should create a complete amortization schedule', () => {
    const schedule = calculateAmortization(1000, 12, 100);
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[schedule.length - 1].balance).toBe(0);
  });

  it('should have decreasing balance', () => {
    const schedule = calculateAmortization(5000, 6, 500);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].balance).toBeLessThan(schedule[i - 1].balance);
    }
  });

  it('should calculate correct interest for first month', () => {
    const schedule = calculateAmortization(12000, 12, 1000);
    expect(schedule[0].interest).toBeCloseTo(120, 0); // 12000 * 0.12/12
  });
});

describe('calculateTotalInterest', () => {
  it('should return total interest paid', () => {
    const interest = calculateTotalInterest(1000, 12, 100);
    expect(interest).toBeGreaterThan(0);
    expect(interest).toBeLessThan(1000); // Interest should be less than principal for reasonable rates
  });

  it('should return 0 for 0% interest', () => {
    const interest = calculateTotalInterest(1000, 0, 100);
    expect(interest).toBe(0);
  });
});

describe('getSnowballOrder', () => {
  it('should sort debts by remaining amount ascending', () => {
    const debts = [
      createDebt(5000, 10),
      createDebt(1000, 15),
      createDebt(3000, 5),
    ];
    const ordered = getSnowballOrder(debts);
    expect(ordered[0].remainingAmount).toBe(1000);
    expect(ordered[1].remainingAmount).toBe(3000);
    expect(ordered[2].remainingAmount).toBe(5000);
  });

  it('should exclude paid off debts', () => {
    const debts = [
      createDebt(5000, 10),
      createDebt(0, 15),
    ];
    const ordered = getSnowballOrder(debts);
    expect(ordered.length).toBe(1);
  });
});

describe('getAvalancheOrder', () => {
  it('should sort debts by interest rate descending', () => {
    const debts = [
      createDebt(5000, 10),
      createDebt(1000, 15),
      createDebt(3000, 5),
    ];
    const ordered = getAvalancheOrder(debts);
    expect(ordered[0].interestRate).toBe(15);
    expect(ordered[1].interestRate).toBe(10);
    expect(ordered[2].interestRate).toBe(5);
  });
});

describe('compareStrategies', () => {
  it('should show avalanche saves on interest', () => {
    const debts = [
      createDebt(10000, 5, 200),
      createDebt(2000, 20, 100),
      createDebt(5000, 12, 150),
    ];
    const result = compareStrategies(debts, 100);
    // Avalanche should pay less interest
    expect(result.avalanche.totalInterest).toBeLessThanOrEqual(result.snowball.totalInterest);
    expect(result.savings).toBeGreaterThanOrEqual(0);
  });
});

// ========== Formatters ==========

describe('formatAmount', () => {
  it('should format with EUR currency', () => {
    const result = formatAmount(1234.56);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('€');
  });

  it('should show sign when requested', () => {
    const positive = formatAmount(100, 'EUR', true);
    expect(positive).toContain('+');

    const negative = formatAmount(-100, 'EUR', true);
    expect(negative).toContain('-');
  });
});

describe('formatAmountShort', () => {
  it('should format thousands with k', () => {
    expect(formatAmountShort(1500)).toBe('1.5k €');
    expect(formatAmountShort(12300)).toBe('12.3k €');
  });

  it('should not use k for small amounts', () => {
    expect(formatAmountShort(500)).toBe('500 €');
  });
});

describe('formatPercentage', () => {
  it('should format percentage correctly', () => {
    expect(formatPercentage(50)).toBe('50%');
    expect(formatPercentage(33.333, 1)).toBe('33.3%');
  });
});

describe('getCurrentMonth', () => {
  it('should return YYYY-MM format', () => {
    const month = getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });
});

// ========== Personalized Tips ==========

describe('getPersonalizedTips', () => {
  it('should warn about overspending', () => {
    const tips = getPersonalizedTips({
      monthlyIncome: 2000,
      totalExpenses: 2500,
    });
    expect(tips.some((t) => t.includes('trošite više'))).toBe(true);
  });

  it('should congratulate on good savings', () => {
    const tips = getPersonalizedTips({
      monthlyIncome: 3000,
      totalExpenses: 2000,
    });
    expect(tips.some((t) => t.includes('Bravo'))).toBe(true);
  });

  it('should warn about low emergency fund', () => {
    const tips = getPersonalizedTips({
      monthlyIncome: 3000,
      totalExpenses: 2500,
      emergencyFundMonths: 1.5,
    });
    expect(tips.some((t) => t.includes('sigurnosni fond'))).toBe(true);
  });

  it('should warn about high subscriptions', () => {
    const tips = getPersonalizedTips({
      monthlyIncome: 3000,
      totalExpenses: 2500,
      subscriptionTotal: 80,
    });
    expect(tips.some((t) => t.includes('Pretplate') || t.includes('pretplate'))).toBe(true);
  });
});

// Helper
function createDebt(remaining: number, rate: number, minPayment: number = 100) {
  return {
    id: 'test',
    userId: 'test',
    name: 'Test',
    totalAmount: remaining * 1.5,
    remainingAmount: remaining,
    interestRate: rate,
    minimumPayment: minPayment,
    dueDate: '15',
    startDate: '2024-01-01',
    type: 'personal_loan' as const,
    createdAt: '',
    updatedAt: '',
  };
}
