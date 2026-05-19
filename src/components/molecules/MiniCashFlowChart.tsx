import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          {t('reports.noData')}
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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
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
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('dashboard.cashFlow')}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalChartContainer}>
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [{ data, strokeWidth: 2 }],
              }}
              width={Dimensions.get('window').width - 32}
              height={300}
              withDots={true}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              yAxisSuffix="€"
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: () => colors.primary,
                labelColor: () => colors.textSecondary,
                propsForBackgroundLines: {
                  strokeDasharray: '4 4',
                  stroke: colors.borderLight,
                  strokeWidth: 0.8,
                },
                propsForLabels: {
                  fontSize: 12,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: colors.primary,
                  fill: colors.card,
                },
                fillShadowGradientFrom: colors.primary,
                fillShadowGradientTo: colors.primary,
                fillShadowGradientFromOpacity: 0.2,
                fillShadowGradientToOpacity: 0.02,
              }}
              bezier
              style={styles.modalChart}
            />
          </View>
        </SafeAreaView>
      </Modal>
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalTitle: {
    ...Typography.heading3,
  },
  modalChartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  modalChart: {
    borderRadius: BorderRadius.md,
  },
});
