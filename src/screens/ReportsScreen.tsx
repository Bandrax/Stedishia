import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAppTheme } from '../hooks';
import { useTranslation } from 'react-i18next';
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
import { exportTransactionsCSV, exportMonthlyReportCSV, shareCSVFile } from '../services/exportService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - Spacing.base * 2;

type ReportTab = 'monthly' | 'yearly' | 'trends' | 'forecast';

export const ReportsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.id || '';
  const { t } = useTranslation();

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
  const [expandedTrend, setExpandedTrend] = useState<{
    categoryId: string;
    name: string;
    emoji: string;
    color: string;
    data: number[];
    labels: string[];
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

  const tabs: Array<{ key: ReportTab; label: string; icon: string }> = [
    { key: 'monthly', label: t('reports.tabMonthly'), icon: 'calendar-outline' },
    { key: 'yearly', label: t('reports.tabYearly'), icon: 'bar-chart-outline' },
    { key: 'trends', label: t('reports.tabTrends'), icon: 'trending-up-outline' },
    { key: 'forecast', label: t('reports.tabForecast'), icon: 'eye-outline' },
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
          <Ionicons name="mail-open-outline" size={48} color={colors.textSecondary} style={{ marginBottom: Spacing.md }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('reports.noData')}
          </Text>
        </View>
      );
    }

    const monthNamesShort = t('reports.months.short', { returnObjects: true }) as string[];
    const labels = monthlyData.map((d) => {
      const [, m] = d.month.split('-');
      return monthNamesShort[parseInt(m) - 1];
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
            {t('reports.last6Months')}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.income')}</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatAmount(totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.expenses')}</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatAmount(totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.saved')}</Text>
              <Text style={[styles.summaryValue, { color: totalSavings >= 0 ? colors.success : colors.error }]}>
                {formatAmount(totalSavings)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.savingsRate')}</Text>
              <Text style={[styles.summaryValue, { color: avgSavingsRate >= 20 ? colors.success : colors.warning }]}>
                {formatPercentage(avgSavingsRate, 1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Graf prihoda vs rashoda */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.text} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {t('reports.incomeVsExpenses')}
            </Text>
          </View>
          <LineChart
            data={{
              labels,
              datasets: [
                { data: monthlyData.map((d) => d.income || 0.01), color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, strokeWidth: 2 },
                { data: monthlyData.map((d) => d.expenses || 0.01), color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 2 },
              ],
            }}
            width={CHART_WIDTH - Spacing.base * 2}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(15, 76, 58, ${opacity})`,
            }}
            style={styles.chart}
            bezier
            withDots
            yAxisLabel=""
            yAxisSuffix=" €"
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('reports.income')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('reports.expenses')}</Text>
            </View>
          </View>
        </View>

        {/* Graf štednje */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cash-outline" size={18} color={colors.text} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {t('reports.monthlyNetResult')}
            </Text>
          </View>
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
          <Ionicons name="mail-open-outline" size={48} color={colors.textSecondary} style={{ marginBottom: Spacing.md }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('reports.loading')}
          </Text>
        </View>
      );
    }

    const monthNamesLetter = t('reports.months.letter', { returnObjects: true }) as string[];
    const labels = yearlyData.monthlyData.map((d) => {
      const [, m] = d.month.split('-');
      return monthNamesLetter[parseInt(m) - 1];
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
            {t('reports.yearlyOverview', { year: selectedYear })}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.totalIncome')}</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatAmount(yearlyData.totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.totalExpenses')}</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatAmount(yearlyData.totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.saved')}</Text>
              <Text style={[styles.summaryValue, { color: yearlyData.totalSavings >= 0 ? colors.success : colors.error }]}>
                {formatAmount(yearlyData.totalSavings)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.savingsRate')}</Text>
              <Text style={[styles.summaryValue, { color: yearlyData.savingsRate >= 20 ? colors.success : colors.warning }]}>
                {formatPercentage(yearlyData.savingsRate, 1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Mjesečni graf */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.text} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {t('reports.incomeVsExpenses')}
            </Text>
          </View>
          <LineChart
            data={{
              labels,
              datasets: [
                { data: yearlyData.monthlyData.map((d) => d.income || 0.01), color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, strokeWidth: 2 },
                { data: yearlyData.monthlyData.map((d) => d.expenses || 0.01), color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 2 },
              ],
            }}
            width={Math.max(CHART_WIDTH - Spacing.base * 2, 350)}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(15, 76, 58, ${opacity})`,
            }}
            style={styles.chart}
            bezier
            withDots
            yAxisLabel=""
            yAxisSuffix=" €"
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('reports.income')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('reports.expenses')}</Text>
            </View>
          </View>
        </View>

        {/* Top kategorije */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy-outline" size={18} color={colors.text} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {t('reports.topExpenseCategories')}
            </Text>
          </View>
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
                    {formatPercentage(cat.percentage, 1)} {t('reports.ofTotalExpenses')}
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
          <Ionicons name="mail-open-outline" size={48} color={colors.textSecondary} style={{ marginBottom: Spacing.md }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('reports.noTrendData')}
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {t('reports.trendDescription')}
        </Text>

        {categoryTrends.slice(0, 8).map((trend) => {
          const info = getCategoryInfo(trend.categoryId);
          const trendColor = trend.trend > 5 ? colors.error : trend.trend < -5 ? colors.success : colors.textSecondary;
          const trendIconName = trend.trend > 5 ? 'trending-up' as const : trend.trend < -5 ? 'trending-down' as const : 'remove-outline' as const;
          const monthNamesLetterTrend = t('reports.months.letter', { returnObjects: true }) as string[];
          const labels = trend.months.map((m) => {
            const [, month] = m.month.split('-');
            return monthNamesLetterTrend[parseInt(month) - 1];
          });

          return (
            <TouchableOpacity
              key={trend.categoryId}
              activeOpacity={0.7}
              onPress={() => setExpandedTrend({
                categoryId: trend.categoryId,
                name: info?.name || trend.categoryId,
                emoji: info?.emoji || '📁',
                color: info?.color || colors.primary,
                data: trend.months.map((m) => m.amount || 0),
                labels,
              })}
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
                    <Ionicons name={trendIconName} size={14} color={trendColor} /> {trend.trend > 0 ? '+' : ''}{formatPercentage(trend.trend, 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.trendNumbers}>
                <Text style={[styles.trendAvg, { color: colors.textSecondary }]}>
                  {t('reports.average', { amount: formatAmount(trend.average) })}
                </Text>
                <Text style={[styles.trendTotal, { color: colors.text }]}>
                  {t('reports.totalAmount', { amount: formatAmount(trend.total) })}
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
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderForecastTab = () => {
    if (!forecastData) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="eye-outline" size={48} color={colors.textSecondary} style={{ marginBottom: Spacing.md }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('reports.loading')}
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
      if (i === 0) return t('reports.before');
      if (i === projectionStartIndex) return t('common.today');
      if (i === sampledData.length - 1) return t('reports.days90');
      return '';
    });

    return (
      <View>
        {/* Trenutno stanje */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="eye-outline" size={18} color={colors.text} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              {t('reports.forecast90')}
            </Text>
          </View>
          <Text style={[styles.forecastSubtitle, { color: colors.textSecondary }]}>
            {t('reports.forecastBasis')}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.currentBalance')}</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatAmount(forecastData.currentBalance)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.projection90')}</Text>
              <Text style={[styles.summaryValue, { color: isPositive ? colors.success : colors.error }]}>
                {formatAmount(forecastData.projectedBalance)}
              </Text>
            </View>
          </View>

          <View style={[styles.forecastChange, { backgroundColor: isPositive ? colors.success + '15' : colors.error + '15' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={isPositive ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={isPositive ? colors.success : colors.error} />
              <Text style={[styles.forecastChangeText, { color: isPositive ? colors.success : colors.error }]}>
                {t('reports.expectedChange', { amount: formatAmount(balanceChange, 'EUR', true) })}
              </Text>
            </View>
          </View>
        </View>

        {/* Forecast graf */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trending-up-outline" size={18} color={colors.text} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {t('reports.balanceProjection')}
            </Text>
          </View>
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
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('reports.actual')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary + '66' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('reports.forecast')}</Text>
            </View>
          </View>
        </View>

        {/* Dnevni prosjeci */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="analytics-outline" size={18} color={colors.text} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {t('reports.dailyAverages')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.avgIncome')}</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {formatAmount(forecastData.avgDailyIncome)}/dan
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.avgExpenses')}</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {formatAmount(forecastData.avgDailyExpense)}/dan
              </Text>
            </View>
          </View>

          <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text style={[styles.hintText, { color: colors.textSecondary, flex: 1 }]}>
                {t('reports.forecastHint')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleExportCSV = async () => {
    try {
      const now = new Date();
      let csv: string;
      let filename: string;

      if (activeTab === 'monthly') {
        const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const dateFrom = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-01`;
        const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
        csv = await exportTransactionsCSV(userId, dateFrom, dateTo);
        filename = `transactions_6months_${now.toISOString().split('T')[0]}.csv`;
      } else if (activeTab === 'yearly') {
        const dateFrom = `${selectedYear}-01-01`;
        const dateTo = `${selectedYear}-12-31`;
        csv = await exportTransactionsCSV(userId, dateFrom, dateTo);
        filename = `transactions_${selectedYear}.csv`;
      } else {
        csv = await exportTransactionsCSV(userId);
        filename = `transactions_all_${now.toISOString().split('T')[0]}.csv`;
      }

      await shareCSVFile(csv, filename);
    } catch (error) {
      Alert.alert(t('reports.exportCSV'), t('reports.exportError'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('reports.title')}</Text>
          <TouchableOpacity onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

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
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#FFFFFF' : colors.textSecondary} />
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

      {/* Expanded Trend Modal */}
      <Modal
        visible={!!expandedTrend}
        animationType="slide"
        onRequestClose={() => setExpandedTrend(null)}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {expandedTrend && (
            <View style={{ flex: 1, padding: Spacing.base }}>
              <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => setExpandedTrend(null)}>
                  <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>
                  {expandedTrend.emoji} {expandedTrend.name}
                </Text>
                <View style={{ width: 24 }} />
              </View>
              <LineChart
                data={{
                  labels: expandedTrend.labels,
                  datasets: [{
                    data: expandedTrend.data.map((d) => d || 0.01),
                    color: (opacity = 1) => {
                      const c = expandedTrend.color;
                      const r = parseInt(c.slice(1, 3), 16);
                      const g = parseInt(c.slice(3, 5), 16);
                      const b = parseInt(c.slice(5, 7), 16);
                      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                    },
                    strokeWidth: 2,
                  }],
                }}
                width={SCREEN_WIDTH - 32}
                height={300}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(15, 76, 58, ${opacity})`,
                }}
                style={styles.chart}
                bezier
                withDots
                yAxisLabel=""
                yAxisSuffix=" €"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.lg }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.averageLabel')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatAmount(expandedTrend.data.reduce((a, b) => a + b, 0) / (expandedTrend.data.length || 1))}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('reports.totalLabel')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatAmount(expandedTrend.data.reduce((a, b) => a + b, 0))}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.heading2,
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
