import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAppTheme } from '../hooks';
import { useAuthStore } from '../store';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatAmount, formatAmountShort, formatMonth, formatPercentage, getCurrentMonth } from '../utils';
import { getCategoryInfo } from '../services/dashboardService';
import {
  getMonthlyOverview,
  getCategoryTrends,
  getCashFlowForecast,
  getYearlyOverview,
} from '../services/reportService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - Spacing.base * 2;

type ReportTab = 'monthly' | 'yearly' | 'trends' | 'forecast';

export const ReportsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.id || '';

  const [activeTab, setActiveTab] = useState<ReportTab>('monthly');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Podaci
  const [monthlyData, setMonthlyData] = useState<Array<{
    month: string; income: number; expenses: number; savings: number;
  }>>([]);
  const [yearlyData, setYearlyData] = useState<{
    totalIncome: number; totalExpenses: number; totalSavings: number;
    savingsRate: number;
    monthlyData: Array<{ month: string; income: number; expenses: number }>;
    topCategories: Array<{ categoryId: string; total: number; percentage: number }>;
  } | null>(null);
  const [categoryTrends, setCategoryTrends] = useState<Array<{
    categoryId: string;
    months: Array<{ month: string; amount: number }>;
    total: number; average: number; trend: number;
  }>>([]);
  const [forecastData, setForecastData] = useState<{
    currentBalance: number; projectedBalance: number;
    dailyData: Array<{ date: string; balance: number; isProjection: boolean }>;
    avgDailyIncome: number; avgDailyExpense: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      if (activeTab === 'monthly') {
        const data = await getMonthlyOverview(userId, 6);
        setMonthlyData(data);
      } else if (activeTab === 'yearly') {
        const data = await getYearlyOverview(userId, selectedYear);
        setYearlyData(data);
      } else if (activeTab === 'trends') {
        const data = await getCategoryTrends(userId, 6);
        setCategoryTrends(data);
      } else if (activeTab === 'forecast') {
        const data = await getCashFlowForecast(userId, 90);
        setForecastData(data);
      }
    } catch (error) {
      console.error('Report load error:', error);
    }
  }, [userId, activeTab, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const tabs: Array<{ key: ReportTab; label: string; emoji: string }> = [
    { key: 'monthly', label: 'Mjesečni', emoji: '📅' },
    { key: 'yearly', label: 'Godišnji', emoji: '📊' },
    { key: 'trends', label: 'Trendovi', emoji: '📈' },
    { key: 'forecast', label: 'Prognoza', emoji: '🔮' },
  ];

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(15, 76, 58, ${opacity})`,
    labelColor: () => colors.textSecondary,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    propsForLabels: {
      fontSize: 10,
    },
    style: {
      borderRadius: BorderRadius.lg,
    },
  };

  const renderMonthlyTab = () => {
    if (monthlyData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyEmoji]}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nema dovoljno podataka za prikaz
          </Text>
        </View>
      );
    }

    const labels = monthlyData.map((d) => {
      const [, m] = d.month.split('-');
      const monthNames = ['Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip', 'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro'];
      return monthNames[parseInt(m) - 1];
    });

    const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
    const totalExpenses = monthlyData.reduce((s, d) => s + d.expenses, 0);
    const totalSavings = totalIncome - totalExpenses;
    const avgSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    return (
      <View>
        {/* Sažetak */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Zadnjih 6 mjeseci
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Prihodi</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatAmount(totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Rashodi</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatAmount(totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ušteđeno</Text>
              <Text style={[styles.summaryValue, { color: totalSavings >= 0 ? colors.success : colors.error }]}>
                {formatAmount(totalSavings)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Stopa štednje</Text>
              <Text style={[styles.summaryValue, { color: avgSavingsRate >= 20 ? colors.success : colors.warning }]}>
                {formatPercentage(avgSavingsRate, 1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Graf prihoda vs rashoda */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            📊 Prihodi vs Rashodi
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={{
                labels,
                datasets: [
                  { data: monthlyData.map((d) => d.income || 0) },
                  { data: monthlyData.map((d) => d.expenses || 0) },
                ],
              }}
              width={Math.max(CHART_WIDTH, labels.length * 70)}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(15, 76, 58, ${opacity})`,
                barPercentage: 0.4,
              }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
              yAxisLabel=""
              yAxisSuffix=" €"
            />
          </ScrollView>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Prihodi</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary + '66' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Rashodi</Text>
            </View>
          </View>
        </View>

        {/* Graf štednje */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            💰 Mjesečna štednja
          </Text>
          <LineChart
            data={{
              labels,
              datasets: [{ data: monthlyData.map((d) => d.savings || 0) }],
            }}
            width={CHART_WIDTH - Spacing.base * 2}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) =>
                totalSavings >= 0
                  ? `rgba(34, 197, 94, ${opacity})`
                  : `rgba(239, 68, 68, ${opacity})`,
            }}
            style={styles.chart}
            bezier
            yAxisLabel=""
            yAxisSuffix=" €"
          />
        </View>

        {/* Mjesečni detalji */}
        {monthlyData.slice().reverse().map((d) => (
          <View
            key={d.month}
            style={[styles.monthRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.monthName, { color: colors.text }]}>
              {formatMonth(d.month)}
            </Text>
            <View style={styles.monthNumbers}>
              <Text style={[styles.monthIncome, { color: colors.success }]}>
                +{formatAmountShort(d.income)}
              </Text>
              <Text style={[styles.monthExpense, { color: colors.error }]}>
                -{formatAmountShort(d.expenses)}
              </Text>
              <Text
                style={[
                  styles.monthSavings,
                  { color: d.savings >= 0 ? colors.success : colors.error },
                ]}
              >
                = {formatAmountShort(d.savings)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderYearlyTab = () => {
    if (!yearlyData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Učitavanje...
          </Text>
        </View>
      );
    }

    const labels = yearlyData.monthlyData.map((d) => {
      const [, m] = d.month.split('-');
      const monthNames = ['S', 'V', 'O', 'T', 'S', 'L', 'S', 'K', 'R', 'L', 'S', 'P'];
      return monthNames[parseInt(m) - 1];
    });

    return (
      <View>
        {/* Godina selektor */}
        <View style={styles.yearSelector}>
          <TouchableOpacity onPress={() => setSelectedYear((y) => y - 1)}>
            <Text style={[styles.yearArrow, { color: colors.primary }]}>◀</Text>
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: colors.text }]}>{selectedYear}</Text>
          <TouchableOpacity
            onPress={() => setSelectedYear((y) => Math.min(y + 1, new Date().getFullYear()))}
          >
            <Text style={[styles.yearArrow, { color: colors.primary }]}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Godišnji sažetak */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Godišnji pregled {selectedYear}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ukupni prihodi</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatAmount(yearlyData.totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ukupni rashodi</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatAmount(yearlyData.totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ušteđeno</Text>
              <Text style={[styles.summaryValue, { color: yearlyData.totalSavings >= 0 ? colors.success : colors.error }]}>
                {formatAmount(yearlyData.totalSavings)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Stopa štednje</Text>
              <Text style={[styles.summaryValue, { color: yearlyData.savingsRate >= 20 ? colors.success : colors.warning }]}>
                {formatPercentage(yearlyData.savingsRate, 1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Mjesečni graf */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            📊 Mjesečni pregled
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={{
                labels,
                datasets: [
                  { data: yearlyData.monthlyData.map((d) => d.expenses || 0) },
                ],
              }}
              width={Math.max(CHART_WIDTH, 400)}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              yAxisLabel=""
              yAxisSuffix=" €"
            />
          </ScrollView>
        </View>

        {/* Top kategorije */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            🏆 Top kategorije rashoda
          </Text>
          {yearlyData.topCategories.map((cat, index) => {
            const info = getCategoryInfo(cat.categoryId);
            return (
              <View key={cat.categoryId} style={styles.categoryRow}>
                <Text style={styles.categoryRank}>{index + 1}.</Text>
                <Text style={styles.categoryEmoji}>{info?.emoji || '📁'}</Text>
                <View style={styles.categoryInfo}>
                  <View style={styles.categoryHeader}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                      {info?.name || cat.categoryId}
                    </Text>
                    <Text style={[styles.categoryAmount, { color: colors.text }]}>
                      {formatAmount(cat.total)}
                    </Text>
                  </View>
                  <View style={[styles.categoryBar, { backgroundColor: colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${cat.percentage}%`,
                          backgroundColor: info?.color || colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                    {formatPercentage(cat.percentage, 1)} ukupnih rashoda
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTrendsTab = () => {
    if (categoryTrends.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nema dovoljno podataka za trendove
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Kako se troškovi mijenjaju kroz vrijeme
        </Text>

        {categoryTrends.slice(0, 8).map((trend) => {
          const info = getCategoryInfo(trend.categoryId);
          const trendColor = trend.trend > 5 ? colors.error : trend.trend < -5 ? colors.success : colors.textSecondary;
          const trendIcon = trend.trend > 5 ? '📈' : trend.trend < -5 ? '📉' : '➡️';
          const labels = trend.months.map((m) => {
            const [, month] = m.month.split('-');
            const monthNames = ['S', 'V', 'O', 'T', 'S', 'L', 'S', 'K', 'R', 'L', 'S', 'P'];
            return monthNames[parseInt(month) - 1];
          });

          return (
            <View
              key={trend.categoryId}
              style={[styles.trendCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.trendHeader}>
                <View style={styles.trendTitleRow}>
                  <Text style={styles.trendEmoji}>{info?.emoji || '📁'}</Text>
                  <Text style={[styles.trendName, { color: colors.text }]}>
                    {info?.name || trend.categoryId}
                  </Text>
                </View>
                <View style={styles.trendStats}>
                  <Text style={[styles.trendChange, { color: trendColor }]}>
                    {trendIcon} {trend.trend > 0 ? '+' : ''}{formatPercentage(trend.trend, 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.trendNumbers}>
                <Text style={[styles.trendAvg, { color: colors.textSecondary }]}>
                  Prosjek: {formatAmount(trend.average)}/mj
                </Text>
                <Text style={[styles.trendTotal, { color: colors.text }]}>
                  Ukupno: {formatAmount(trend.total)}
                </Text>
              </View>

              <LineChart
                data={{
                  labels,
                  datasets: [{ data: trend.months.map((m) => m.amount || 0) }],
                }}
                width={CHART_WIDTH - Spacing.base * 2}
                height={120}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => {
                    const c = info?.color || colors.primary;
                    // Koristi boju kategorije
                    const r = parseInt(c.slice(1, 3), 16);
                    const g = parseInt(c.slice(3, 5), 16);
                    const b = parseInt(c.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                  },
                }}
                style={styles.chart}
                bezier
                withDots
                withInnerLines={false}
                withOuterLines={false}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>
          );
        })}
      </View>
    );
  };

  const renderForecastTab = () => {
    if (!forecastData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔮</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Učitavanje prognoze...
          </Text>
        </View>
      );
    }

    const balanceChange = forecastData.projectedBalance - forecastData.currentBalance;
    const isPositive = balanceChange >= 0;

    // Smanji podatke za graf - svaki 3. dan
    const sampledData = forecastData.dailyData.filter((_, i) => i % 3 === 0 || i === forecastData.dailyData.length - 1);
    const todayIndex = sampledData.findIndex((d) => !d.isProjection);
    const projectionStartIndex = sampledData.findIndex((d) => d.isProjection);

    const labels = sampledData.map((d, i) => {
      if (i === 0) return 'Prije';
      if (i === projectionStartIndex) return 'Danas';
      if (i === sampledData.length - 1) return '90d';
      return '';
    });

    return (
      <View>
        {/* Trenutno stanje */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            🔮 Prognoza za 90 dana
          </Text>
          <Text style={[styles.forecastSubtitle, { color: colors.textSecondary }]}>
            Na temelju vaših prošlih transakcija
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Trenutni saldo</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatAmount(forecastData.currentBalance)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Projekcija (90d)</Text>
              <Text style={[styles.summaryValue, { color: isPositive ? colors.success : colors.error }]}>
                {formatAmount(forecastData.projectedBalance)}
              </Text>
            </View>
          </View>

          <View style={[styles.forecastChange, { backgroundColor: isPositive ? colors.success + '15' : colors.error + '15' }]}>
            <Text style={[styles.forecastChangeText, { color: isPositive ? colors.success : colors.error }]}>
              {isPositive ? '📈' : '📉'} Očekivana promjena: {formatAmount(balanceChange, 'EUR', true)}
            </Text>
          </View>
        </View>

        {/* Forecast graf */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            💹 Projekcija salda
          </Text>
          <LineChart
            data={{
              labels,
              datasets: [{
                data: sampledData.map((d) => d.balance || 0),
              }],
            }}
            width={CHART_WIDTH - Spacing.base * 2}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(15, 76, 58, ${opacity})`,
              fillShadowGradient: colors.primary,
              fillShadowGradientOpacity: 0.1,
            }}
            style={styles.chart}
            bezier
            withDots={false}
            yAxisLabel=""
            yAxisSuffix=" €"
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Stvarno</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary + '66' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Prognoza</Text>
            </View>
          </View>
        </View>

        {/* Dnevni prosjeci */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            📊 Dnevni prosjeci (zadnjih 90 dana)
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Prosjek prihoda</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatAmount(forecastData.avgDailyIncome)}/dan
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Prosjek rashoda</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatAmount(forecastData.avgDailyExpense)}/dan
              </Text>
            </View>
          </View>

          <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              💡 Ova prognoza se temelji na vašim prosječnim prihodima i rashodima
              iz zadnjih 3 mjeseca. Što više podataka unesete, prognoza će biti točnija.
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>📊 Izvještaji</Text>

        {/* Tabovi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.key ? colors.primary : colors.surfaceVariant,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sadržaj */}
        {activeTab === 'monthly' && renderMonthlyTab()}
        {activeTab === 'yearly' && renderYearlyTab()}
        {activeTab === 'trends' && renderTrendsTab()}
        {activeTab === 'forecast' && renderForecastTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  title: {
    ...Typography.heading1,
    marginBottom: Spacing.md,
  },
  tabsContainer: {
    marginBottom: Spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  tabEmoji: {
    fontSize: 14,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sažetak
  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Grafovi
  chartCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  chartTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.md,
  },
  chart: {
    borderRadius: BorderRadius.lg,
    marginLeft: -Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },

  // Mjesečni redovi
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  monthNumbers: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  monthIncome: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthExpense: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthSavings: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Kategorije
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
  },
  categoryRank: {
    fontSize: 14,
    fontWeight: '700',
    width: 24,
    color: '#999',
  },
  categoryEmoji: {
    fontSize: 22,
    marginRight: Spacing.sm,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercent: {
    fontSize: 11,
  },

  // Trendovi
  trendCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  trendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trendEmoji: {
    fontSize: 22,
  },
  trendName: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendStats: {
    alignItems: 'flex-end',
  },
  trendChange: {
    fontSize: 13,
    fontWeight: '700',
  },
  trendNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  trendAvg: {
    fontSize: 12,
  },
  trendTotal: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },

  // Forecast
  forecastSubtitle: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  forecastChange: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  forecastChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Year selector
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  yearArrow: {
    fontSize: 20,
    fontWeight: '700',
    padding: Spacing.sm,
  },
  yearText: {
    fontSize: 22,
    fontWeight: '700',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Hint
  hint: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
