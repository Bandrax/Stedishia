import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks';
import { useAuthStore } from '../store';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants';
import { Button } from '../components/atoms';

export const SettingsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { logout } = useAuthStore();
  const { mode, setMode } = useThemeStore();

  const themeOptions: Array<{ key: 'light' | 'dark' | 'system'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'light', label: 'Svijetla', icon: 'sunny-outline' },
    { key: 'dark', label: 'Tamna', icon: 'moon-outline' },
    { key: 'system', label: 'Sustav', icon: 'phone-portrait-outline' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Odjava',
      'Jeste li sigurni da se želite odjaviti? Vaši podaci ostaju spremljeni.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Odjavi se',
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
        <Text style={[styles.screenTitle, { color: colors.text }]}>Postavke</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profil */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Profil</Text>
          </View>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {currentUser?.name || 'Korisnik'}
              </Text>
              <Text style={[styles.profileDetail, { color: colors.textSecondary }]}>
                Mjesečni prihod: {currentUser?.monthlyIncome || 0} €
              </Text>
              <Text style={[styles.profileDetail, { color: colors.textSecondary }]}>
                Budget mod: {currentUser?.budgetMode === 'envelope' ? 'Envelope' : '50/30/20'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tema */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Tema</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Regionalno</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Valuta</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>EUR (€)</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Jezik</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Hrvatski</Text>
          </View>
        </View>

        {/* Sigurnost */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Sigurnost</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>PIN zaključavanje</Text>
            <Text style={[styles.settingValue, { color: colors.success }]}>Aktivno</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Biometrija</Text>
            <Text style={[styles.settingValue, { color: currentUser?.biometricEnabled ? colors.success : colors.textSecondary }]}>
              {currentUser?.biometricEnabled ? 'Aktivno' : 'Neaktivno'}
            </Text>
          </View>
        </View>

        {/* O aplikaciji */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>O aplikaciji</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Verzija</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Izrađeno s</Text>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>React Native + Expo</Text>
          </View>
        </View>

        {/* Odjava */}
        <View style={styles.logoutSection}>
          <Button
            title="Odjavi se"
            onPress={handleLogout}
            variant="outline"
            fullWidth
            icon="log-out-outline"
          />
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Sthedisia v1.0.0{'\n'}
          Vaši podaci su pohranjeni lokalno na uređaju.
        </Text>
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
});
