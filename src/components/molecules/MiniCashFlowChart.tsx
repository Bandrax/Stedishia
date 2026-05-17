import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing, BorderRadius } from '../../constants';

interface MiniCashFlowChartProps {
  data: number[]; // 30 dana podataka (dnevni saldo)
  labels?: string[];
}

const screenWidth = Dimensions.get('window').width;

export const MiniCashFlowChart: React.FC<MiniCashFlowChartProps> = ({
  data,
  labels,
}) => {
  const { colors, isDark } = useAppTheme();

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          📊 Nedovoljno podataka za graf
        </Text>
      </View>
    );
  }

  // Prikaži samo svaki 5. label da ne bude pregusto
  const chartLabels = labels || data.map((_, i) => {
    if (i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) {
      return `${i + 1}.`;
    }
    return '';
  });

  return (
    <View>
      <LineChart
        data={{
          labels: chartLabels,
          datasets: [{ data, strokeWidth: 2 }],
        }}
        width={screenWidth - Spacing.base * 2 - Spacing.lg * 2}
        height={160}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: colors.card,
          backgroundGradientTo: colors.card,
          decimalPlaces: 0,
          color: () => colors.primary,
          labelColor: () => colors.textTertiary,
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: colors.borderLight,
            strokeWidth: 0.5,
          },
          propsForLabels: {
            fontSize: 10,
          },
          fillShadowGradientFrom: colors.primary,
          fillShadowGradientTo: colors.primary,
          fillShadowGradientFromOpacity: 0.15,
          fillShadowGradientToOpacity: 0.01,
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chart: {
    borderRadius: BorderRadius.md,
    paddingRight: 0,
    marginLeft: -16,
  },
  empty: {
    height: 120,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.bodySmall,
  },
});
