import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks';
import { useAuthStore, useTransactionStore } from '../store';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatRelativeDate } from '../utils';
import { getTransactions } from '../services/transactionService';
import { TransactionListItem } from '../components/molecules/TransactionListItem';
import { AddTransactionScreen } from './AddTransactionScreen';
import type { Transaction, TransactionType } from '../types';

interface TransactionSection {
  title: string;
  data: Transaction[];
}

export const TransactionsScreen: React.FC = () => {
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

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
    // TODO: Navigacija na detalje/edit transakcije
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
    { value: 'all', label: 'Sve' },
    { value: 'expense', label: '📉 Rashodi' },
    { value: 'income', label: '📈 Prihodi' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transakcije</Text>
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
          placeholder="🔍 Pretraži transakcije..."
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
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nema transakcija
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'Pokušajte s drugim pojmom pretrage.'
                : 'Dodajte prvu transakciju pritiskom na + gumb!'}
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
        <Text style={styles.fabText}>+</Text>
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
