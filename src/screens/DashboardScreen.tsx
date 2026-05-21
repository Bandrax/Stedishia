import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks';
import { useAuthStore, useAccountStore } from '../store';
import { Typography, Spacing, BorderRadius, ALL_DEFAULT_CATEGORIES } from '../constants';
import { formatAmount } from '../utils';
import {
  getTotalBalance,
  getMonthlyStats,
  getTopExpenses,
  getUpcomingPayments,
  getBudgetProgress,
  getDailyCashFlow,
  getMonthlyChangePercent,
  getCategoryInfo,
  getSavingsStats,
} from '../services/dashboardService';
import { getRecurringPaymentStatus } from '../services/recurringService';
import { ensureMonthTransition, getSnapshot, getPreviousMonth } from '../services/monthTransitionService';
import { getDailyTip } from '../services/tips';
import { getCurrentMonth } from '../utils';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/atoms';
import {
  BalanceCard,
  StatusSemaphore,
  BudgetProgressBar,
  UpcomingPaymentItem,
  TopExpenseItem,
  MiniCashFlowChart,
  DailyTipCard,
  LastMonthCard,
} from '../components/molecules';
import type { BudgetStatus } from '../components/molecules';
import type { MonthlySnapshot } from '../types';

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  changePercent: number;
  budgetStatus: BudgetStatus;
  budgetItems: Array<{ category_id: string; allocated: number; spent: number }>;
  topExpenses: Array<{ category_id: string; total: number }>;
  upcomingPayments: Array<{
    id: string;
    description: string;
    amount: number;
    next_due_date: string;
    category_id: string;
  }>;
  cashFlowData: number[];
  overBudgetDetails: Array<{ categoryName: string; categoryId: string; spent: number; allocated: number }>;
  nearLimitDetails: Array<{ categoryName: string; categoryId: string; spent: number; allocated: number }>;
  totalAllocated: number;
  totalSpent: number;
  savingsBalance: number;
  monthlySavingsTransfers: number;
  unpaidRecurringCount: number;
  overdueRecurringCount: number;
  totalDueThisMonth: number;
}

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const { currentUser } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [lastMonthSnapshot, setLastMonthSnapshot] = useState<MonthlySnapshot | null>(null);
  const [prevMonthSnapshot, setPrevMonthSnapshot] = useState<MonthlySnapshot | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Osiguraj mjesečni prijelaz (snapshot, budget copy, recurring advance)
      const transitionResult = await ensureMonthTransition(currentUser.id);

      // Dohvati snapshot prošlog mjeseca za karticu
      const currentMonth = getCurrentMonth();
      const prevMonth = getPreviousMonth(currentMonth);
      const prevPrevMonth = getPreviousMonth(prevMonth);
      const [snap, prevSnap] = await Promise.all([
        transitionResult.snapshot || getSnapshot(currentUser.id, prevMonth),
        getSnapshot(currentUser.id, prevPrevMonth),
      ]);
      setLastMonthSnapshot(snap);
      setPrevMonthSnapshot(prevSnap);

      const [
        totalBalance,
        monthlyStats,
        changePercent,
        topExp,
        upcoming,
        budgetProgress,
        cashFlow,
        savingsStats,
        recurringStatus,
      ] = await Promise.all([
        getTotalBalance(currentUser.id),
        getMonthlyStats(currentUser.id),
        getMonthlyChangePercent(currentUser.id),
        getTopExpenses(currentUser.id),
        getUpcomingPayments(currentUser.id),
        getBudgetProgress(currentUser.id),
        getDailyCashFlow(currentUser.id),
        getSavingsStats(currentUser.id),
        getRecurringPaymentStatus(currentUser.id),
      ]);

      // Odredi budget status na temelju potrošnje (isključi savings — ide kroz transfere)
      const activeBudgetItems = budgetProgress.filter((b) => b.category_id !== 'savings');
      let budgetStatus: BudgetStatus = 'good';
      const overBudgetItems = activeBudgetItems.filter(
        (b) => b.allocated > 0 && b.spent > b.allocated
      );
      const nearLimitItems = activeBudgetItems.filter(
        (b) => b.allocated > 0 && b.spent / b.allocated > 0.8 && b.spent <= b.allocated
      );

      if (overBudgetItems.length > 0) budgetStatus = 'over';
      else if (nearLimitItems.length > 0) budgetStatus = 'warning';

      // Ako nema budgeta postavljenog, koristi omjer prihoda/rashoda
      if (budgetProgress.length === 0 && monthlyStats.income > 0) {
        const ratio = monthlyStats.expenses / monthlyStats.income;
        if (ratio > 1) budgetStatus = 'over';
        else if (ratio > 0.8) budgetStatus = 'warning';
      }

      const totalAllocated = activeBudgetItems.reduce((s, b) => s + b.allocated, 0);
      const totalSpent = activeBudgetItems.reduce((s, b) => s + b.spent, 0);

      const mapToDetail = (b: { category_id: string; allocated: number; spent: number }) => {
        const catInfo = getCategoryInfo(b.category_id);
        return {
          categoryName: catInfo?.name ?? b.category_id,
          categoryId: b.category_id,
          spent: b.spent,
          allocated: b.allocated,
        };
      };

      setData({
        totalBalance,
        monthlyIncome: monthlyStats.income,
        monthlyExpenses: monthlyStats.expenses,
        changePercent,
        budgetStatus,
        budgetItems: budgetProgress,
        topExpenses: topExp,
        upcomingPayments: upcoming,
        cashFlowData: cashFlow,
        overBudgetDetails: overBudgetItems.map(mapToDetail),
        nearLimitDetails: nearLimitItems.map(mapToDetail),
        totalAllocated,
        totalSpent,
        savingsBalance: savingsStats.savingsBalance,
        monthlySavingsTransfers: savingsStats.monthlyTransfers,
        unpaidRecurringCount: recurringStatus.unpaidCount,
        overdueRecurringCount: recurringStatus.overdueCount,
        totalDueThisMonth: recurringStatus.totalDueThisMonth,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const dailyTip = getDailyTip();
  const userName = currentUser?.name || '';

  // Ako nema podataka, prikaži skeleton/empty state
  const hasTransactions = data && (data.monthlyIncome > 0 || data.monthlyExpenses > 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {t('dashboard.greeting', { name: userName })}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('dashboard.title')}
          </Text>
        </View>

        {/* Balance Card */}
        <BalanceCard
          totalBalance={data?.totalBalance ?? 0}
          monthlyIncome={data?.monthlyIncome ?? 0}
          monthlyExpenses={data?.monthlyExpenses ?? 0}
          changePercent={data?.changePercent ?? 0}
        />

        {/* Prošli mjesec */}
        {lastMonthSnapshot && (lastMonthSnapshot.totalIncome > 0 || lastMonthSnapshot.totalExpenses > 0) && (
          <View style={styles.section}>
            <LastMonthCard
              snapshot={lastMonthSnapshot}
              previousSnapshot={prevMonthSnapshot}
              monthLabel={(() => {
                const [y, m] = lastMonthSnapshot.month.split('-');
                return `${m}.${y}`;
              })()}
            />
          </View>
        )}

        {/* Štednja kartica */}
        {data && data.savingsBalance > 0 && (
          <Card style={styles.section} variant="default">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="cash-outline" size={18} color="#D4AF37" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('dashboard.savings')}
              </Text>
            </View>
            <View style={styles.savingsRow}>
              <View style={styles.savingsStat}>
                <Text style={[styles.savingsLabel, { color: colors.textSecondary }]}>
                  {t('dashboard.savingsTotal')}
                </Text>
                <Text style={[styles.savingsValue, { color: '#D4AF37' }]}>
                  {formatAmount(data.savingsBalance)}
                </Text>
              </View>
              {data.monthlySavingsTransfers > 0 && (
                <View style={styles.savingsStat}>
                  <Text style={[styles.savingsLabel, { color: colors.textSecondary }]}>
                    {t('dashboard.savingsThisMonth')}
                  </Text>
                  <Text style={[styles.savingsValue, { color: colors.success }]}>
                    +{formatAmount(data.monthlySavingsTransfers)}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Semafor */}
        <View style={styles.section}>
          <StatusSemaphore
            status={data?.budgetStatus ?? 'good'}
            overBudgetItems={data?.overBudgetDetails}
            nearLimitItems={data?.nearLimitDetails}
            totalSpent={data?.totalSpent}
            totalAllocated={data?.totalAllocated}
            monthlyIncome={data?.monthlyIncome}
            monthlyExpenses={data?.monthlyExpenses}
          />
        </View>

        {/* Budget Progress */}
        {data && data.budgetItems.length > 0 && (
          <Card style={styles.section} variant="default">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('dashboard.budgetThisMonth')}
              </Text>
            </View>
            {data.budgetItems.filter((b) => b.category_id !== 'savings').slice(0, 5).map((item) => {
              const catInfo = getCategoryInfo(item.category_id);
              return (
                <BudgetProgressBar
                  key={item.category_id}
                  categoryName={catInfo?.name ?? item.category_id}
                  categoryId={item.category_id}
                  spent={item.spent}
                  allocated={item.allocated}
                  color={catInfo?.color ?? '#607D8B'}
                />
              );
            })}
          </Card>
        )}

        {/* Top troškovi */}
        {data && data.topExpenses.length > 0 && (
          <Card style={styles.section} variant="default">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flame-outline" size={18} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('dashboard.topExpenses')}
              </Text>
            </View>
            {data.topExpenses.map((expense, index) => {
              const catInfo = getCategoryInfo(expense.category_id);
              const totalExpenses = data.monthlyExpenses || 1;
              return (
                <TopExpenseItem
                  key={expense.category_id}
                  rank={index + 1}
                  categoryId={expense.category_id}
                  categoryName={catInfo?.name ?? expense.category_id}
                  amount={expense.total}
                  percentage={(expense.total / totalExpenses) * 100}
                  color={catInfo?.color ?? '#607D8B'}
                />
              );
            })}
          </Card>
        )}

        {/* Upozorenje za neplaćena ponavljajuća plaćanja */}
        {data && (data.overdueRecurringCount > 0 || data.unpaidRecurringCount > 0) && (
          <TouchableOpacity
            style={[
              styles.recurringWarning,
              {
                backgroundColor: data.overdueRecurringCount > 0 ? colors.error + '15' : colors.warning + '15',
                borderColor: data.overdueRecurringCount > 0 ? colors.error + '40' : colors.warning + '40',
              },
            ]}
            onPress={() => navigation.navigate('RecurringPayments')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={data.overdueRecurringCount > 0 ? 'alert-circle' : 'warning-outline'}
              size={22}
              color={data.overdueRecurringCount > 0 ? colors.error : colors.warning}
              style={{ marginRight: Spacing.sm }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.recurringWarningText, { color: data.overdueRecurringCount > 0 ? colors.error : colors.warning }]}>
                {data.overdueRecurringCount > 0
                  ? t('dashboard.overduePayments', { count: data.overdueRecurringCount })
                  : t('dashboard.unpaidPayments', { count: data.unpaidRecurringCount })}
              </Text>
              <Text style={[styles.recurringWarningSubtext, { color: colors.textSecondary }]}>
                {t('dashboard.totalDueThisMonth', { amount: formatAmount(data.totalDueThisMonth) })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Predstojeća plaćanja */}
        {data && data.upcomingPayments.length > 0 && (
          <Card style={styles.section} variant="default">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('dashboard.upcomingPayments')}
              </Text>
            </View>
            {data.upcomingPayments.map((payment) => {
              const catInfo = getCategoryInfo(payment.category_id);
              const dueDate = new Date(payment.next_due_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const daysUntil = Math.ceil(
                (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <UpcomingPaymentItem
                  key={payment.id}
                  categoryId={payment.category_id}
                  description={payment.description}
                  amount={payment.amount}
                  dueDate={payment.next_due_date}
                  daysUntil={Math.max(0, daysUntil)}
                />
              );
            })}
          </Card>
        )}

        {/* Cash Flow graf */}
        {data && data.cashFlowData.some((v) => v !== 0) && (
          <Card style={styles.section} variant="default">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trending-up-outline" size={18} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('dashboard.cashFlow')}
              </Text>
            </View>
            <MiniCashFlowChart data={data.cashFlowData} />
          </Card>
        )}

        {/* Savjet dana */}
        {!tipDismissed && (
          <View style={styles.section}>
            <DailyTipCard tip={dailyTip} onDismiss={() => setTipDismissed(true)} />
          </View>
        )}

        {/* Empty state */}
        {!hasTransactions && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={56} color={colors.textTertiary} style={{ marginBottom: Spacing.base }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('dashboard.noTransactions')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('dashboard.noTransactionsHint')}
            </Text>
          </View>
        )}

        {/* Dno paddinga */}
        <View style={{ height: Spacing['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  greeting: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  headerTitle: {
    ...Typography.heading1,
  },
  section: {
    marginTop: Spacing.base,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subtitle,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  savingsStat: {
    alignItems: 'center',
  },
  savingsLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  savingsValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTitle: {
    ...Typography.heading3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
  },
  recurringWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  recurringWarningText: {
    fontSize: 14,
    fontWeight: '700',
  },
  recurringWarningSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
