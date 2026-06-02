import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { LANGUAGE_NAMES } from '@/lib/i18n';
import { saveLocale } from '@/lib/locale-prefs';
import { useAppTheme } from '@/lib/theme';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const bootstrap = useBootstrap();
  const locales = bootstrap.data?.island?.locales ?? ['pt', 'en'];

  const changeLanguage = async (code: string) => {
    await saveLocale(code);
    await i18n.changeLanguage(code);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]}>{t('settingsTitle')}</Text>

        <Text style={[styles.section, { color: theme.text }]}>{t('settingsLanguage')}</Text>
        {locales.map((code) => (
          <Pressable
            key={code}
            onPress={() => changeLanguage(code)}
            style={[
              styles.row,
              {
                borderColor: theme.border,
                backgroundColor: i18n.language === code ? theme.primary : theme.card,
              },
            ]}
          >
            <Text style={{ color: i18n.language === code ? '#fff' : theme.text, fontWeight: '600' }}>
              {LANGUAGE_NAMES[code] ?? code}
            </Text>
          </Pressable>
        ))}

        <Text style={[styles.section, { color: theme.text, marginTop: 24 }]}>
          {t('settingsPrivacy')}
        </Text>
        <Pressable
          onPress={() => router.push('/onboarding/consent')}
          style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}
        >
          <Text style={{ color: theme.text, fontWeight: '600' }}>{t('settingsManageConsent')}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
          <Text style={{ color: theme.secondary, fontWeight: '600' }}>{t('settingsBack')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  section: { fontWeight: '700', marginBottom: 10 },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  backBtn: {
    marginTop: 32,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
