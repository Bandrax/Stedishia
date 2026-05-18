import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks';
import { useAuthStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatAmount, formatMonth, getCurrentMonth } from '../utils';
import { getHouseholdStats, exportToFile, importFromFile, mergeImportedData } from '../services/syncService';
import { getHouseholdMonthlyStats } from '../services/dashboardService';
import { Button } from '../components/atoms';

export const HouseholdScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const household = useAuthStore((s) => s.household);
  const userId = currentUser?.id || '';
  const householdId = currentUser?.householdId || '';

  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [householdStats, setHouseholdStats] = useState<{
    totalIncome: number;
    totalExpenses: number;
    sharedExpenses: number;
    memberStats: Array<{
      userId: string; name: string; income: number; expenses: number; sharedExpenses: number;
    }>;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!householdId) return;
    try {
      const stats = await getHouseholdStats(householdId, currentMonth);
      setHouseholdStats(stats);
    } catch (error) {
      console.error('Household data error:', error);
    }
  }, [householdId, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction);
    setCurrentMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportToFile(userId, householdId);
      setSyncMessage('Podaci eksportirani uspješno!');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (error) {
      Alert.alert('Greška', 'Nije moguće eksportirati podatke.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Import podataka',
      'Ovo će dodati podatke iz datoteke u vašu bazu. Postojeći podaci neće biti zamijenjeni.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Nastavi',
          onPress: async () => {
            setLoading(true);
            try {
              const data = await importFromFile();
              if (!data) {
                setLoading(false);
                return;
              }

              const result = await mergeImportedData(data, userId, 'merge');

              Alert.alert(
                'Import završen',
                `Uvezeno:\n` +
                `• ${result.transactionsImported} transakcija\n` +
                `• ${result.accountsImported} računa\n` +
                `• ${result.goalsImported} ciljeva\n` +
                `• ${result.debtsImported} dugova\n` +
                (result.conflicts > 0 ? `\n${result.conflicts} zapisa već postoji.` : '')
              );

              loadData();
            } catch (error) {
              Alert.alert('Greška', 'Nevaljan format datoteke ili greška pri importu.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const totalShared = householdStats?.sharedExpenses || 0;
  const perPerson = householdStats?.memberStats.length ? totalShared / householdStats.memberStats.length : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Kućanstvo</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Household info */}
        <View style={[styles.householdCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="home" size={40} color="#FFFFFF" style={{ marginBottom: 8 }} />
          <Text style={styles.householdName}>{household?.name || 'Naše kućanstvo'}</Text>
          <Text style={styles.householdMembers}>
            {householdStats?.memberStats.map((m) => m.name).join(' & ') || currentUser?.name || 'Učitavanje...'}
          </Text>
        </View>

        {/* Mjesec navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)}>
            <Text style={[styles.monthArrow, { color: colors.primary }]}>◀</Text>
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {formatMonth(currentMonth)}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)}>
            <Text style={[styles.monthArrow, { color: colors.primary }]}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Zajednički troškovi */}
        <View style={[styles.sharedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Zajednički troškovi
          </Text>

          <View style={styles.sharedTotal}>
            <Text style={[styles.sharedAmount, { color: colors.error }]}>
              {formatAmount(totalShared)}
            </Text>
            <Text style={[styles.sharedLabel, { color: colors.textSecondary }]}>
              ukupno zajedničkih troškova
            </Text>
          </View>

          {householdStats && householdStats.memberStats.length > 1 && (
            <View style={[styles.splitInfo, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.splitText, { color: colors.text }]}>
                Podijeljeno na {householdStats.memberStats.length}: po {formatAmount(perPerson)} svako
              </Text>
            </View>
          )}
        </View>

        {/* Članovi kućanstva */}
        {householdStats && householdStats.memberStats.length > 0 && (
          <View style={[styles.membersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Članovi kućanstva
            </Text>

            {householdStats.memberStats.map((member, index) => {
              const isCurrentUser = member.userId === userId;
              const balance = member.sharedExpenses - perPerson;

              return (
                <View
                  key={member.userId}
                  style={[
                    styles.memberRow,
                    index < householdStats.memberStats.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.memberInfo}>
                    <Ionicons name={isCurrentUser ? 'person' : 'people'} size={20} color={colors.primary} style={{ marginRight: 8 }} />
                    <View>
                      <Text style={[styles.memberName, { color: colors.text }]}>
                        {member.name} {isCurrentUser ? '(vi)' : ''}
                      </Text>
                      <Text style={[styles.memberStats, { color: colors.textSecondary }]}>
                        Prihodi: {formatAmount(member.income)} • Rashodi: {formatAmount(member.expenses)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberBalance}>
                    <Text style={[styles.memberShared, { color: colors.textSecondary }]}>
                      Zajedničko: {formatAmount(member.sharedExpenses)}
                    </Text>
                    {householdStats.memberStats.length > 1 && (
                      <Text
                        style={[
                          styles.memberDiff,
                          { color: balance > 0 ? colors.success : balance < 0 ? colors.error : colors.textSecondary },
                        ]}
                      >
                        {balance > 0 ? `Duguje im se ${formatAmount(balance)}` :
                         balance < 0 ? `Duguje ${formatAmount(Math.abs(balance))}` :
                         'Izbalansirano'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Ukupni pregled */}
        {householdStats && (
          <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Kućanski pregled
            </Text>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Ukupni prihodi</Text>
                <Text style={[styles.overviewValue, { color: colors.success }]}>
                  {formatAmount(householdStats.totalIncome)}
                </Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Ukupni rashodi</Text>
                <Text style={[styles.overviewValue, { color: colors.error }]}>
                  {formatAmount(householdStats.totalExpenses)}
                </Text>
              </View>
            </View>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Razlika</Text>
                <Text
                  style={[
                    styles.overviewValue,
                    {
                      color: householdStats.totalIncome - householdStats.totalExpenses >= 0
                        ? colors.success
                        : colors.error,
                    },
                  ]}
                >
                  {formatAmount(householdStats.totalIncome - householdStats.totalExpenses)}
                </Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Zajedničko</Text>
                <Text style={[styles.overviewValue, { color: colors.text }]}>
                  {formatAmount(householdStats.sharedExpenses)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sync section */}
        <View style={[styles.syncCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Sinkronizacija
          </Text>
          <Text style={[styles.syncDesc, { color: colors.textSecondary }]}>
            Eksportirajte svoje podatke kao JSON datoteku i podijelite je s partnerom/icom
            putem Google Drivea, AirDropa ili druge metode.
          </Text>

          {syncMessage && (
            <View style={[styles.syncSuccess, { backgroundColor: colors.success + '15' }]}>
              <Text style={[styles.syncSuccessText, { color: colors.success }]}>
                {syncMessage}
              </Text>
            </View>
          )}

          {loading && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: Spacing.md }} />
          )}

          <View style={styles.syncButtons}>
            <Button
              title="Eksportiraj podatke"
              icon="cloud-upload-outline"
              onPress={handleExport}
              variant="primary"
              fullWidth
              disabled={loading}
            />
            <View style={{ height: Spacing.sm }} />
            <Button
              title="Importiraj podatke"
              icon="cloud-download-outline"
              onPress={handleImport}
              variant="outline"
              fullWidth
              disabled={loading}
            />
          </View>

          <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Kako funkcionira sync:{'\n'}
              1. Svako eksportira svoje podatke{'\n'}
              2. Stavite datoteke u zajedničku Google Drive mapu{'\n'}
              3. Svako importira podatke onog drugog{'\n'}
              4. Ponovite po potrebi (novi podaci se dodaju, duplikati se preskaču)
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: { fontSize: 16, fontWeight: '600' },
  screenTitle: { ...Typography.heading2 },
  content: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },

  householdCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  householdEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  householdName: { color: '#FFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  householdMembers: { color: '#FFFFFFBB', fontSize: 14 },

  monthNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  monthArrow: { fontSize: 20, fontWeight: '700', padding: Spacing.sm },
  monthText: { fontSize: 18, fontWeight: '700' },

  sectionTitle: { ...Typography.subtitle, marginBottom: Spacing.md },

  sharedCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  sharedTotal: { alignItems: 'center', marginBottom: Spacing.md },
  sharedAmount: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  sharedLabel: { fontSize: 13, marginTop: 4 },
  splitInfo: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  splitText: { fontSize: 14, fontWeight: '600' },

  membersCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  memberRow: {
    paddingVertical: Spacing.md,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  memberEmoji: { fontSize: 24, marginRight: Spacing.md },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberStats: { fontSize: 12, marginTop: 2 },
  memberBalance: { marginLeft: Spacing['2xl'] + Spacing.md },
  memberShared: { fontSize: 13 },
  memberDiff: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  overviewCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  overviewItem: { flex: 1 },
  overviewLabel: { fontSize: 12, marginBottom: 4 },
  overviewValue: { fontSize: 18, fontWeight: '700' },

  syncCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  syncDesc: { fontSize: 14, lineHeight: 22, marginBottom: Spacing.md },
  syncButtons: { marginBottom: Spacing.md },
  syncSuccess: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  syncSuccessText: { fontSize: 14, fontWeight: '600' },

  hint: { padding: Spacing.sm, borderRadius: BorderRadius.md },
  hintText: { fontSize: 12, lineHeight: 20 },
});
