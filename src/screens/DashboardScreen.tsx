import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../hooks';
import { useAuthStore, useAccountStore } from '../store';
import { Typography, Spacing, ALL_DEFAULT_CATEGORIES } from '../constants';
import { formatAmount } from '../utils';
import {
  getTotalBalance,
  getMonthlyStats,
  getHouseholdMonthlyStats,
  getTopExpenses,
  getUpcomingPayments,
  getBudgetProgress,
  getDailyCashFlow,
  getMonthlyChangePercent,
  getCategoryInfo,
} from '../services/dashboardService';
import { getDailyTip } from '../services/tips';
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
  ScopeToggle,
} from '../components/molecules';
import type { BudgetStatus } from '../components/molecules';

type Scope = 'personal' | 'household';

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
  overBudgetDetails: Array<{ categoryName: string; emoji: string; spent: number; allocated: number }>;
  nearLimitDetails: Array<{ categoryName: string; emoji: string; spent: number; allocated: number }>;
  totalAllocated: number;
  totalSpent: number;
}

export const DashboardScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { currentUser, household } = useAuthStore();
  const [scope, setScope] = useState<Scope>('personal');
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const [
        totalBalance,
        monthlyStats,
        changePercent,
        topExp,
        upcoming,
        budgetProgress,
        cashFlow,
      ] = await Promise.all([
        getTotalBalance(currentUser.id),
        scope === 'household' && household
          ? getHouseholdMonthlyStats(household.id)
          : getMonthlyStats(currentUser.id),
        getMonthlyChangePercent(currentUser.id),
        getTopExpenses(currentUser.id),
        getUpcomingPayments(currentUser.id),
        getBudgetProgress(currentUser.id),
        getDailyCashFlow(currentUser.id),
      ]);

      // Odredi budget status na temelju potrošnje
      let budgetStatus: BudgetStatus = 'good';
      const overBudgetItems = budgetProgress.filter(
        (b) => b.allocated > 0 && b.spent > b.allocated
      );
      const nearLimitItems = budgetProgress.filter(
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

      const totalAllocated = budgetProgress.reduce((s, b) => s + b.allocated, 0);
      const totalSpent = budgetProgress.reduce((s, b) => s + b.spent, 0);

      const mapToDetail = (b: { category_id: string; allocated: number; spent: number }) => {
        const catInfo = getCategoryInfo(b.category_id);
        return {
          categoryName: catInfo?.name ?? b.category_id,
          emoji: catInfo?.emoji ?? '📌',
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
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, [currentUser, household, scope]);

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
            Bok, {userName}!
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Početna
          </Text>
        </View>

        {/* Scope toggle */}
        <View style={styles.toggleRow}>
          <ScopeToggle scope={scope} onScopeChange={setScope} />
        </View>

        {/* Balance Card */}
        <BalanceCard
          totalBalance={data?.totalBalance ?? 0}
          monthlyIncome={data?.monthlyIncome ?? 0}
          monthlyExpenses={data?.monthlyExpenses ?? 0}
          changePercent={data?.changePercent ?? 0}
        />

        {/* Semafor */}
        <View style={styles.section}>
          <StatusSemaphore
            status={data?.budgetStatus ?? 'good'}
            overBudgetItems={data?.overBudgetDetails}
            nearLimitItems={data?.nearLimitDetails}
            totalSpent={data?.totalSpent}
            totalAllocated={data?.totalAllocated}
          />
        </View>

        {/* Budget Progress */}
        {data && data.budgetItems.length > 0 && (
          <Card style={styles.section} variant="default">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Budžet ovog mjeseca
              </Text>
            </View>
            {data.budgetItems.slice(0, 5).map((item) => {
              const catInfo = getCategoryInfo(item.category_id);
              return (
                <BudgetProgressBar
                  key={item.category_id}
                  categoryName={catInfo?.name ?? item.category_id}
                  emoji={catInfo?.emoji ?? '📌'}
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
                Najveći troškovi
              </Text>
            </View>
            {data.topExpenses.map((expense, index) => {
              const catInfo = getCategoryInfo(expense.category_id);
              const totalExpenses = data.monthlyExpenses || 1;
              return (
                <TopExpenseItem
                  key={expense.category_id}
                  rank={index + 1}
                  emoji={catInfo?.emoji ?? '📌'}
                  categoryName={catInfo?.name ?? expense.category_id}
                  amount={expense.total}
                  percentage={(expense.total / totalExpenses) * 100}
                  color={catInfo?.color ?? '#607D8B'}
                />
              );
            })}
          </Card>
        )}

        {/* Predstojeća plaćanja */}
        {data && data.upcomingPayments.length > 0 && (
          <Card style={styles.section} variant="default">
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Predstojeća plaćanja
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
                  emoji={catInfo?.emoji ?? '📌'}
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
                Tok novca (30 dana)
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
              Još nemate transakcija
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Dodajte prvu transakciju pritiskom na tab "Transakcije" i krenite pratiti svoje financije!
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
  toggleRow: {
    marginBottom: Spacing.base,
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
});
