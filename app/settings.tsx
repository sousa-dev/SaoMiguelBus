import { Check } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { LANGUAGE_NAMES } from '@/lib/i18n';
import { saveLocale } from '@/lib/locale-prefs';
import { space, typography } from '@/lib/tokens';
import { type ThemePreference, useThemePrefsStore } from '@/lib/theme-prefs';
import { useAppTheme } from '@/lib/theme';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const bootstrap = useBootstrap();
  const locales = bootstrap.data?.island?.locales ?? ['pt', 'en'];
  const preference = useThemePrefsStore((s) => s.preference);
  const setPreference = useThemePrefsStore((s) => s.setPreference);

  const changeLanguage = async (code: string) => {
    await saveLocale(code);
    await i18n.changeLanguage(code);
  };

  const themeOptions = [
    { value: 'system' as ThemePreference, label: t('themeSystem') },
    { value: 'light' as ThemePreference, label: t('themeLight') },
    { value: 'dark' as ThemePreference, label: t('themeDark') },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.display, { color: theme.primary, marginBottom: space.lg }]}>{t('settingsTitle')}</Text>

        <Text style={[typography.overline, { color: theme.muted, marginBottom: space.sm }]}>{t('settingsAppearance')}</Text>
        <SegmentedControl options={themeOptions} value={preference} onChange={setPreference} accessibilityLabel={t('themeLabel')} />

        <Text style={[typography.overline, { color: theme.muted, marginTop: space['2xl'], marginBottom: space.sm }]}>
          {t('settingsLanguage')}
        </Text>
        <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {locales.map((code) => (
            <ListRow
              key={code}
              title={LANGUAGE_NAMES[code] ?? code}
              onPress={() => changeLanguage(code)}
              showChevron={false}
              trailing={
                i18n.language === code ? (
                  <Check size={20} color={theme.primary} strokeWidth={2.5} />
                ) : null
              }
            />
          ))}
        </View>

        <Text style={[typography.overline, { color: theme.muted, marginTop: space['2xl'], marginBottom: space.sm }]}>
          {t('settingsPrivacy')}
        </Text>
        <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ListRow title={t('settingsManageConsent')} onPress={() => router.push('/onboarding/consent')} />
        </View>

        <ListRow title={t('settingsBack')} onPress={() => router.back()} showChevron={false} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
