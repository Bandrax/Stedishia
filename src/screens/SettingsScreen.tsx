import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks';
import { useAuthStore, useSettingsStore, CURRENCIES } from '../store';
import type { IconStyle, BudgetView } from '../store';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants';
import { Button } from '../components/atoms';
import { useTranslation } from 'react-i18next';
import i18n from '../locales/i18n';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { logout } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const { currency, setCurrency, iconStyle, setIconStyle, defaultBudgetView, setDefaultBudgetView } = useSettingsStore();
  const [language, setLanguage] = useState<'hr' | 'en'>(i18n.language as 'hr' | 'en' || 'hr');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const activeCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  const handleLanguageChange = (lang: 'hr' | 'en') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const themeOptions: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'light', label: t('settings.themeLight'), icon: 'sunny-outline' },
    { key: 'dark', label: t('settings.themeDark'), icon: 'moon-outline' },
    { key: 'system', label: t('settings.themeSystem'), icon: 'phone-portrait-outline' },
  ];

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutTitle'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profil */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('settings.profile')}</Text>
          </View>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {currentUser?.name || t('settings.profile')}
              </Text>
              <Text style={[styles.profileDetail, { color: colors.textSecondary }]}>
                {t('settings.monthlyIncome', { amount: currentUser?.monthlyIncome || 0 })}
              </Text>
              <Text style={[styles.profileDetail, { color: colors.textSecondary }]}>
                {t('settings.budgetMode', { mode: currentUser?.budgetMode === 'envelope' ? t('settings.budgetModeEnvelope') : t('settings.budgetMode503020') })}
              </Text>
            </View>
          </View>
        </View>

        {/* Tema */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('settings.theme')}</Text>
          </View>
          <View style={styles.themeRow}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: mode === option.key ? colors.primary + '20' : colors.surfaceVariant,
                    borderColor: mode === option.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode(option.key)}
              >
                <Ionicons name={option.icon} size={20} color={mode === option.key ? colors.primary : colors.textSecondary} style={{ marginBottom: 4 }} />
                <Text
                  style={[styles.themeLabel, { color: mode === option.key ? colors.primary : colors.text }]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Valuta i jezik */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="globe-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('settings.regional')}</Text>
          </View>
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.currency')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.settingValue, { color: colors.primary }]}>
                {activeCurrency.code} ({activeCurrency.symbol})
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
          <View style={{ marginTop: Spacing.sm }}>
            <Text style={[styles.settingLabel, { color: colors.text, marginBottom: Spacing.sm }]}>{t('settings.language')}</Text>
            <View style={styles.themeRow}>
              {([
                { key: 'hr' as const, label: 'Hrvatski', icon: 'flag-outline' as keyof typeof Ionicons.glyphMap },
                { key: 'en' as const, label: 'English', icon: 'globe-outline' as keyof typeof Ionicons.glyphMap },
              ]).map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: language === option.key ? colors.primary + '20' : colors.surfaceVariant,
                      borderColor: language === option.key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleLanguageChange(option.key)}
                >
                  <Ionicons name={option.icon} size={20} color={language === option.key ? colors.primary : colors.textSecondary} style={{ marginBottom: 4 }} />
                  <Text style={[styles.themeLabel, { color: language === option.key ? colors.primary : colors.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Stil ikona */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="shapes-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('settings.iconStyle')}</Text>
          </View>
          <View style={styles.themeRow}>
            {([
              { key: 'classic' as IconStyle, label: t('settings.iconStyleClassic'), preview: '🏠 🍽️ 🚗' },
              { key: 'modern' as IconStyle, label: t('settings.iconStyleModern'), preview: '' },
            ]).map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: iconStyle === option.key ? colors.primary + '20' : colors.surfaceVariant,
                    borderColor: iconStyle === option.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setIconStyle(option.key)}
              >
                {option.key === 'classic' ? (
                  <Text style={{ fontSize: 18, marginBottom: 4 }}>{option.preview}</Text>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="home-outline" size={18} color={iconStyle === option.key ? colors.primary : colors.textSecondary} />
                    <Ionicons name="restaurant-outline" size={18} color={iconStyle === option.key ? colors.primary : colors.textSecondary} />
                    <Ionicons name="car-outline" size={18} color={iconStyle === option.key ? colors.primary : colors.textSecondary} />
                  </View>
                )}
                <Text style={[styles.themeLabel, { color: iconStyle === option.key ? colors.primary : colors.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Zadani prikaz budžeta */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="wallet-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('settings.defaultBudgetView')}</Text>
          </View>
          <View style={styles.themeRow}>
            {([
              { key: 'envelope' as BudgetView, label: t('settings.defaultBudgetEnvelope'), icon: 'mail-outline' as const },
              { key: '50-30-20' as BudgetView, label: t('settings.defaultBudget5030'), icon: 'pie-chart-outline' as const },
            ]).map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: defaultBudgetView === option.key ? colors.primary + '20' : colors.surfaceVariant,
                    borderColor: defaultBudgetView === option.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setDefaultBudgetView(option.key)}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={defaultBudgetView === option.key ? colors.primary : colors.textSecondary}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.themeLabel, { color: defaultBudgetView === option.key ? colors.primary : colors.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sigurnost */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('settings.security')}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.pinLock')}</Text>
            <Text style={[styles.settingValue, { color: colors.success }]}>{t('common.active')}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.biometric')}</Text>
            <Text style={[styles.settingValue, { color: currentUser?.biometricEnabled ? colors.success : colors.textSecondary }]}>
              {currentUser?.biometricEnabled ? t('common.active') : t('common.inactive')}
            </Text>
          </View>
        </View>

        {/* O aplikaciji */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('settings.about')}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.version')}</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.madeWith')}</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>React Native + Expo</Text>
          </View>
        </View>

        {/* Odjava */}
        <View style={styles.logoutSection}>
          <Button
            title={t('settings.logout')}
            onPress={handleLogout}
            variant="outline"
            fullWidth
            icon="log-out-outline"
          />
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          {t('settings.footer')}
        </Text>
      </ScrollView>

      {/* Currency picker modal */}
      <Modal visible={showCurrencyPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md }}>
            <Text style={[{ ...Typography.heading2 }, { color: colors.text }]}>{t('settings.currency')}</Text>
            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.base }}>
            {CURRENCIES.map((cur) => (
              <TouchableOpacity
                key={cur.code}
                style={[
                  styles.currencyRow,
                  {
                    backgroundColor: currency === cur.code ? colors.primary + '15' : 'transparent',
                    borderColor: currency === cur.code ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { setCurrency(cur.code); setShowCurrencyPicker(false); }}
              >
                <Text style={[styles.currencySymbol, { color: currency === cur.code ? colors.primary : colors.text }]}>
                  {cur.symbol}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.currencyCode, { color: colors.text }]}>{cur.code}</Text>
                  <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{cur.name}</Text>
                </View>
                {currency === cur.code && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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

  section: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.subtitle, marginBottom: Spacing.md },

  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarEmoji: { fontSize: 28 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  profileDetail: { fontSize: 13, marginTop: 2 },

  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  themeEmoji: { fontSize: 24, marginBottom: 4 },
  themeLabel: { fontSize: 13, fontWeight: '600' },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingValue: { fontSize: 14 },

  logoutSection: { marginTop: Spacing.lg, marginBottom: Spacing.md },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 20,
    paddingVertical: Spacing.lg,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    width: 40,
    textAlign: 'center',
  },
  currencyCode: {
    ...Typography.body,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 12,
  },
});
