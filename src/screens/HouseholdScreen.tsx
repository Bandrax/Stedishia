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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../hooks';
import { useAuthStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants';
import { formatAmount, getCurrentMonth } from '../utils';
import { exportToFile, importFromFile, mergeImportedData } from '../services/syncService';
import {
  createHousehold,
  joinHousehold,
  leaveHousehold,
  getHouseholdById,
  getHouseholdMemberBalances,
} from '../services/householdService';
import { Button } from '../components/atoms';

export const HouseholdScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const { currentUser, household, setHousehold, setCurrentUser } = useAuthStore();
  const userId = currentUser?.id || '';
  const householdId = currentUser?.householdId || '';

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  // State za kreiranje/pridruživanje
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Članovi kućanstva s stanjima
  const [memberBalances, setMemberBalances] = useState<Array<{
    userId: string;
    name: string;
    totalBalance: number;
    monthlyExpenses: number;
  }>>([]);

  const currentMonth = getCurrentMonth();
  const hasHousehold = !!householdId && !!household;

  const loadData = useCallback(async () => {
    if (!householdId) return;
    try {
      // Osvježi household podatke
      const h = await getHouseholdById(householdId);
      if (h) setHousehold(h);

      const balances = await getHouseholdMemberBalances(householdId, currentMonth);
      setMemberBalances(balances);
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

  const handleCreate = async () => {
    if (!householdName.trim()) return;
    setLoading(true);
    try {
      const h = await createHousehold(userId, householdName.trim());
      setHousehold(h);
      if (currentUser) {
        setCurrentUser({ ...currentUser, householdId: h.id });
      }
      setShowCreateForm(false);
      setHouseholdName('');
      Alert.alert(t('household.createSuccess'));
      loadData();
    } catch (error) {
      console.error('Create household error:', error);
      Alert.alert(t('common.error'), String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCodeInput.trim()) return;
    setLoading(true);
    try {
      const h = await joinHousehold(userId, inviteCodeInput.trim());
      if (!h) {
        Alert.alert(t('common.error'), t('household.joinError'));
        return;
      }
      setHousehold(h);
      if (currentUser) {
        setCurrentUser({ ...currentUser, householdId: h.id });
      }
      setShowJoinForm(false);
      setInviteCodeInput('');
      Alert.alert(t('household.joinSuccess'));
      loadData();
    } catch (error) {
      console.error('Join household error:', error);
      Alert.alert(t('common.error'), t('household.joinError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      t('household.leaveConfirmTitle'),
      t('household.leaveConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('household.leaveHousehold'),
          style: 'destructive',
          onPress: async () => {
            await leaveHousehold(userId);
            setHousehold(null);
            if (currentUser) {
              setCurrentUser({ ...currentUser, householdId: '' });
            }
            setMemberBalances([]);
            Alert.alert(t('household.leaveSuccess'));
          },
        },
      ]
    );
  };

  const handleCopyCode = async () => {
    if (household?.inviteCode) {
      await Clipboard.setStringAsync(household.inviteCode);
      setSyncMessage(t('household.codeCopied'));
      setTimeout(() => setSyncMessage(null), 2000);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportToFile(userId, householdId);
      setSyncMessage(t('household.exportSuccess'));
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (error) {
      Alert.alert(t('common.error'), t('household.exportError'));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      t('household.importConfirmTitle'),
      t('household.importConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
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
                t('household.importSuccessTitle'),
                t('household.importResult', {
                  transactions: result.transactionsImported,
                  accounts: result.accountsImported,
                  goals: result.goalsImported,
                  debts: result.debtsImported,
                }) +
                (result.conflicts > 0 ? `\n${t('household.existingRecords', { count: result.conflicts })}` : '')
              );

              loadData();
            } catch (error) {
              Alert.alert(t('common.error'), t('household.importError'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const totalHouseholdBalance = memberBalances.reduce((sum, m) => sum + m.totalBalance, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('household.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {!hasHousehold ? (
          /* ===== NEMA KUĆANSTVA — prikaz za kreiranje/pridruživanje ===== */
          <View>
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t('household.noHousehold')}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                {t('household.noHouseholdDesc')}
              </Text>
            </View>

            {/* Kreiraj kućanstvo */}
            {!showCreateForm && !showJoinForm && (
              <View style={styles.actionButtons}>
                <Button
                  title={t('household.createHousehold')}
                  icon="add-circle-outline"
                  onPress={() => setShowCreateForm(true)}
                  variant="primary"
                  fullWidth
                />
                <View style={{ height: Spacing.sm }} />
                <Button
                  title={t('household.joinHousehold')}
                  icon="enter-outline"
                  onPress={() => setShowJoinForm(true)}
                  variant="outline"
                  fullWidth
                />
              </View>
            )}

            {/* Forma za kreiranje */}
            {showCreateForm && (
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('household.createHousehold')}
                </Text>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t('household.enterName')}
                </Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={householdName}
                  onChangeText={setHouseholdName}
                  placeholder={t('household.enterNamePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
                <View style={styles.formActions}>
                  <TouchableOpacity onPress={() => setShowCreateForm(false)}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <Button
                    title={t('household.createHousehold')}
                    onPress={handleCreate}
                    variant="primary"
                    disabled={!householdName.trim() || loading}
                    loading={loading}
                  />
                </View>
              </View>
            )}

            {/* Forma za pridruživanje */}
            {showJoinForm && (
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('household.joinHousehold')}
                </Text>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t('household.enterInviteCode')}
                </Text>
                <TextInput
                  style={[styles.textInput, styles.codeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={inviteCodeInput}
                  onChangeText={setInviteCodeInput}
                  placeholder={t('household.enterInviteCodePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                  autoFocus
                />
                <View style={styles.formActions}>
                  <TouchableOpacity onPress={() => setShowJoinForm(false)}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <Button
                    title={t('household.joinHousehold')}
                    onPress={handleJoin}
                    variant="primary"
                    disabled={!inviteCodeInput.trim() || loading}
                    loading={loading}
                  />
                </View>
              </View>
            )}
          </View>
        ) : (
          /* ===== IMA KUĆANSTVO — prikaz podataka ===== */
          <View>
            {/* Household header kartica s pozivnim kodom */}
            <View style={[styles.householdCard, { backgroundColor: colors.primary }]}>
              <Ionicons name="home" size={36} color="#FFFFFF" style={{ marginBottom: 8 }} />
              <Text style={styles.householdName}>{household?.name || t('household.title')}</Text>

              {/* Pozivni kod */}
              <TouchableOpacity
                style={styles.inviteCodeRow}
                onPress={handleCopyCode}
                activeOpacity={0.7}
              >
                <Text style={styles.inviteCodeLabel}>{t('household.inviteCode')}:</Text>
                <Text style={styles.inviteCodeValue}>{household?.inviteCode}</Text>
                <Ionicons name="copy-outline" size={16} color="#FFFFFFCC" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              <Text style={styles.inviteCodeHint}>{t('household.inviteCodeHint')}</Text>
            </View>

            {syncMessage && (
              <View style={[styles.toast, { backgroundColor: colors.success + '15' }]}>
                <Text style={[styles.toastText, { color: colors.success }]}>{syncMessage}</Text>
              </View>
            )}

            {/* Ukupno stanje kućanstva */}
            <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                {t('household.householdTotal')}
              </Text>
              <Text style={[styles.totalAmount, { color: totalHouseholdBalance >= 0 ? colors.success : colors.error }]}>
                {formatAmount(totalHouseholdBalance)}
              </Text>
            </View>

            {/* Članovi s stanjima */}
            {memberBalances.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('household.members')}
                </Text>

                {memberBalances.map((member, index) => {
                  const isCurrentUser = member.userId === userId;

                  return (
                    <View
                      key={member.userId}
                      style={[
                        styles.memberRow,
                        index < memberBalances.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.memberLeft}>
                        <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons
                            name={isCurrentUser ? 'person' : 'people'}
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                        <View>
                          <Text style={[styles.memberName, { color: colors.text }]}>
                            {member.name} {isCurrentUser ? t('household.you') : ''}
                          </Text>
                          <Text style={[styles.memberSub, { color: colors.textSecondary }]}>
                            {t('household.memberStats', {
                              balance: formatAmount(member.totalBalance),
                              expenses: formatAmount(member.monthlyExpenses),
                            })}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.memberBalance,
                          { color: member.totalBalance >= 0 ? colors.success : colors.error },
                        ]}
                      >
                        {formatAmount(member.totalBalance)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Sync section */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('household.sync')}
              </Text>
              <Text style={[styles.syncDesc, { color: colors.textSecondary }]}>
                {t('household.syncDescription')}
              </Text>

              {loading && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: Spacing.md }} />
              )}

              <View style={styles.syncButtons}>
                <Button
                  title={t('household.exportData')}
                  icon="cloud-upload-outline"
                  onPress={handleExport}
                  variant="primary"
                  fullWidth
                  disabled={loading}
                />
                <View style={{ height: Spacing.sm }} />
                <Button
                  title={t('household.importData')}
                  icon="cloud-download-outline"
                  onPress={handleImport}
                  variant="outline"
                  fullWidth
                  disabled={loading}
                />
              </View>

              <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                  {t('household.syncHint')}
                </Text>
              </View>
            </View>

            {/* Napusti kućanstvo */}
            <TouchableOpacity
              style={[styles.leaveButton, { borderColor: colors.error + '30' }]}
              onPress={handleLeave}
              activeOpacity={0.6}
            >
              <Ionicons name="exit-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={[styles.leaveText, { color: colors.error }]}>
                {t('household.leaveHousehold')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: Spacing['2xl'] }} />
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
  screenTitle: { ...Typography.heading2 },
  content: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTitle: {
    ...Typography.heading3,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
  },

  actionButtons: {
    marginTop: Spacing.lg,
  },

  // Forms
  formCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginTop: Spacing.lg,
  },
  inputLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelText: {
    ...Typography.body,
    fontWeight: '500',
  },

  // Household card
  householdCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  householdName: { color: '#FFF', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: 6,
  },
  inviteCodeLabel: { color: '#FFFFFFAA', fontSize: 13, marginRight: 6 },
  inviteCodeValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  inviteCodeHint: { color: '#FFFFFF99', fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Toast
  toast: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  toastText: { fontSize: 14, fontWeight: '600' },

  // Total card
  totalCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalLabel: { fontSize: 13, marginBottom: 4 },
  totalAmount: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },

  // Cards
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },

  sectionTitle: { ...Typography.subtitle, marginBottom: Spacing.md },

  // Members
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberSub: { fontSize: 12, marginTop: 2 },
  memberBalance: { fontSize: 18, fontWeight: '700' },

  // Sync
  syncDesc: { fontSize: 14, lineHeight: 22, marginBottom: Spacing.md },
  syncButtons: { marginBottom: Spacing.md },

  hint: { padding: Spacing.sm, borderRadius: BorderRadius.md },
  hintText: { fontSize: 12, lineHeight: 20 },

  // Leave
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  leaveText: { fontSize: 15, fontWeight: '600' },
});
