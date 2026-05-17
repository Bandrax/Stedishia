import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks';
import { Typography, Spacing } from '../../constants';

export const WelcomeStep: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💰</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Dobrodošli u{'\n'}MojNovčanik!
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Vaš osobni vodič kroz kućne financije
      </Text>

      <View style={[styles.philosophyCard, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={styles.philosophyEmoji}>💡</Text>
        <Text style={[styles.philosophyText, { color: colors.text }]}>
          MojNovčanik vam pomaže da svaki euro ima svoju svrhu. Umjesto da
          pratite gdje je novac otišao, planiramo unaprijed kamo će ići.
        </Text>
        <Text style={[styles.philosophyHighlight, { color: colors.primary }]}>
          Jednostavno, bez kompliciranog ekonomskog žargona.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading1,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  philosophyCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    width: '100%',
  },
  philosophyEmoji: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  philosophyText: {
    ...Typography.body,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  philosophyHighlight: {
    ...Typography.body,
    fontWeight: '600',
  },
});
