import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks';
import { useAuthStore, useTransactionStore } from '../store';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatRelativeDate, formatAmount } from '../utils';
import { getCategoryInfo } from '../services/dashboardService';
import { getTransactions } from '../services/transactionService';
import { TransactionListItem } from '../components/molecules/TransactionListItem';
import { AddTransactionScreen } from './AddTransactionScreen';
import type { Transaction, TransactionType } from '../types';

interface TransactionSection {
  title: string;
  data: Transaction[];
}

export const TransactionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { currentUser } = useAuthStore();
  const { transactions, setTransactions } = useTransactionStore();
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');

  const loadTransactions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const txs = await getTransactions({
        userId: currentUser.id,
        type: filterType === 'all' ? undefined : filterType,
        searchQuery: searchQuery || undefined,
        limit: 200,
      });
      setTransactions(txs);
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  }, [currentUser, filterType, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleAddClose = () => {
    setShowAdd(false);
    loadTransactions();
  };

  const handleTransactionPress = (tx: Transaction) => {
    const catInfo = getCategoryInfo(tx.categoryId);
    const typeLabel = t(`transactions.type.${tx.type}`);
    const sign = tx.type === 'income' ? '+' : '-';
    Alert.alert(
      `${catInfo?.emoji ?? '📌'} ${tx.description}`,
      [
        `${typeLabel}: ${sign}${formatAmount(tx.amount)}`,
        `${t('transactions.category')}: ${catInfo?.name ?? tx.categoryId}`,
        `${t('transactions.date')}: ${tx.date}`,
        t(`transactions.scope.${tx.scope}`),
        tx.note ? `\n${t('transactions.note')}: ${tx.note}` : '',
        tx.tags && tx.tags.length > 0 ? `${t('transactions.tags')}: ${tx.tags.join(', ')}` : '',
      ].filter(Boolean).join('\n')
    );
  };

  // Grupiraj transakcije po datumu
  const sections: TransactionSection[] = React.useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const dateKey = tx.date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(tx);
    }
    return Array.from(grouped.entries()).map(([date, data]) => ({
      title: formatRelativeDate(date),
      data,
    }));
  }, [transactions]);

  const filterOptions: { value: TransactionType | 'all'; label: string }[] = [
    { value: 'all', label: t('transactions.filterAll') },
    { value: 'expense', label: t('transactions.filterExpenses') },
    { value: 'income', label: t('transactions.filterIncome') },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('transactions.title')}</Text>
      </View>

      {/* Pretraga */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: colors.surfaceVariant, color: colors.text },
          ]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`🔍 ${t('transactions.searchPlaceholder')}`}
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
        />
      </View>

      {/* Filteri */}
      <View style={styles.filterRow}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterType === opt.value ? colors.primary : colors.surfaceVariant,
              },
            ]}
            onPress={() => setFilterType(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filterType === opt.value ? colors.textOnPrimary : colors.text,
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista transakcija */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            onPress={handleTransactionPress}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} style={{ marginBottom: Spacing.base }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('transactions.noTransactions')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? t('transactions.noResults')
                : t('transactions.noTransactionsHint')}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.divider }]} />
        )}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : undefined}
        stickySectionHeadersEnabled
      />

      {/* FAB - dodaj transakciju */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal za dodavanje */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <AddTransactionScreen onClose={handleAddClose} />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.heading1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Typography.body,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    marginLeft: Spacing.base + 44 + Spacing.md,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing['5xl'],
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.heading3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '400',
    marginTop: -2,
  },
});
