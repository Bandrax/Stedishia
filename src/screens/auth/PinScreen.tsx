import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useAppTheme } from '../../hooks';
import { useAuthStore } from '../../store';
import { dbGetAll } from '../../services/database';
import { Typography, Spacing, BorderRadius } from '../../constants';

const PIN_LENGTH = 4;

type PinMode = 'enter' | 'create' | 'confirm';

export const PinScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { setAuthenticated, setCurrentUser, setHousehold, currentUser } = useAuthStore();

  const [mode, setMode] = useState<PinMode>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [hasBiometric, setHasBiometric] = useState(false);
  const [hasStoredPin, setHasStoredPin] = useState(false);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    // Provjeri postoji li spremljeni PIN
    const storedPin = await SecureStore.getItemAsync('user_pin');
    if (storedPin) {
      setHasStoredPin(true);
      setMode('enter');
    } else {
      setMode('create');
    }

    // Provjeri biometrijsku podršku
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBiometric(compatible && enrolled);

    // Ako ima biometriju i ima PIN, pokušaj biometrijsku auth
    if (storedPin && compatible && enrolled) {
      tryBiometric();
    }
  };

  const tryBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Prijavite se u MojNovčanik',
        cancelLabel: 'Koristi PIN',
        disableDeviceFallback: true,
      });
      if (result.success) {
        await loadUserAndAuthenticate();
      }
    } catch {
      // Korisnik je otkazao, koristi PIN
    }
  };

  const loadUserAndAuthenticate = async () => {
    try {
      // Učitaj korisnika iz baze
      const users = await dbGetAll<any>('users');
      if (users.length > 0) {
        const user = users[0];
        setCurrentUser({
          id: user.id,
          name: user.name,
          monthlyIncome: user.monthly_income,
          currency: user.currency,
          householdId: user.household_id,
          budgetMode: user.budget_mode,
          biometricEnabled: user.biometric_enabled === 1,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        });

        // Učitaj kućanstvo
        const households = await dbGetAll<any>(
          'households',
          'id = ?',
          [user.household_id]
        );
        if (households.length > 0) {
          setHousehold({
            id: households[0].id,
            name: households[0].name,
            members: [user.id],
            createdAt: households[0].created_at,
          });
        }
      }
      setAuthenticated(true);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const handleDigit = async (digit: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === PIN_LENGTH) {
      if (mode === 'create') {
        setConfirmPin(newPin);
        setPin('');
        setMode('confirm');
      } else if (mode === 'confirm') {
        if (newPin === confirmPin) {
          // Spremi PIN
          await SecureStore.setItemAsync('user_pin', newPin);
          await loadUserAndAuthenticate();
        } else {
          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          setError('PIN-ovi se ne podudaraju. Pokušajte ponovo.');
          setPin('');
          setMode('create');
          setConfirmPin('');
        }
      } else {
        // Provjeri PIN
        const storedPin = await SecureStore.getItemAsync('user_pin');
        if (newPin === storedPin) {
          await loadUserAndAuthenticate();
        } else {
          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          setError('Pogrešan PIN. Pokušajte ponovo.');
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Kreirajte PIN';
      case 'confirm':
        return 'Potvrdite PIN';
      case 'enter':
        return currentUser
          ? `Bok, ${currentUser.name}! 👋`
          : 'Unesite PIN';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'create':
        return 'Odaberite 4-znamenkasti PIN za zaštitu vaših podataka';
      case 'confirm':
        return 'Unesite PIN ponovo za potvrdu';
      case 'enter':
        return 'Unesite svoj PIN za pristup';
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🔐</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {getTitle()}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {getSubtitle()}
          </Text>
        </View>

        {/* PIN točkice */}
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < pin.length ? colors.primary : 'transparent',
                  borderColor: i < pin.length ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Error */}
        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        {/* Numerička tipkovnica */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            [
              hasBiometric && mode === 'enter' ? 'bio' : '',
              '0',
              'del',
            ],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key, keyIndex) => {
                if (key === '') {
                  return <View key={keyIndex} style={styles.keyEmpty} />;
                }
                if (key === 'bio') {
                  return (
                    <TouchableOpacity
                      key={keyIndex}
                      style={styles.key}
                      onPress={tryBiometric}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.keyBio}>
                        {Platform.OS === 'ios' ? '👤' : '👆'}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                if (key === 'del') {
                  return (
                    <TouchableOpacity
                      key={keyIndex}
                      style={styles.key}
                      onPress={handleDelete}
                      activeOpacity={0.6}
                      disabled={pin.length === 0}
                    >
                      <Text
                        style={[
                          styles.keyDel,
                          { color: pin.length === 0 ? colors.textTertiary : colors.text },
                        ]}
                      >
                        ⌫
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={[styles.key, { backgroundColor: colors.surface }]}
                    onPress={() => handleDigit(key)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.keyText, { color: colors.text }]}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: Spacing.base,
  },
  title: {
    ...Typography.heading2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  error: {
    ...Typography.bodySmall,
    textAlign: 'center',
    fontWeight: '500',
    minHeight: 20,
  },
  errorPlaceholder: {
    minHeight: 20,
  },
  keypad: {
    gap: Spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmpty: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
  },
  keyBio: {
    fontSize: 28,
  },
  keyDel: {
    fontSize: 24,
  },
});
