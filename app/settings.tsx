import { Check, Download, Globe, ShieldCheck, Trash2 } from 'lucide-react-native';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { LANGUAGE_NAMES } from '@/lib/i18n';
import { saveLocale } from '@/lib/locale-prefs';
import { useNetworkStatus } from '@/lib/network-status';
import { space, typography } from '@/lib/tokens';
import { type ThemePreference, useThemePrefsStore } from '@/lib/theme-prefs';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { useAppTheme } from '@/lib/theme';
import { staticIslandConfig } from '@/config/island';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const screenOptions = useAppStackScreenOptions();
  const { isOnline } = useNetworkStatus();
  const bootstrap = useBootstrap();
  const locales = bootstrap.data?.island?.locales ?? ['pt', 'en'];
  const islandName = bootstrap.data?.island?.name ?? staticIslandConfig.islandName;
  const preference = useThemePrefsStore((s) => s.preference);
  const setPreference = useThemePrefsStore((s) => s.setPreference);
  const [dsarBanner, setDsarBanner] = useState(false);

  const changeLanguage = async (code: string) => {
    await saveLocale(code);
    await i18n.changeLanguage(code);
  };

  const themeOptions = [
    { value: 'system' as ThemePreference, label: t('themeSystem') },
    { value: 'light' as ThemePreference, label: t('themeLight') },
    { value: 'dark' as ThemePreference, label: t('themeDark') },
  ];

  const dsarAction = (kind: 'export' | 'delete') => {
    if (!isOnline) {
      setDsarBanner(true);
      return;
    }
    Alert.alert(
      kind === 'export' ? t('settingsExportData') : t('settingsDeleteData'),
      kind === 'export' ? t('settingsExportComingSoon') : t('settingsDeleteComingSoon'),
    );
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <Stack.Screen
        options={{
          ...screenOptions,
          headerShown: true,
          title: t('settingsTitle'),
          presentation: 'modal',
          ...(Platform.OS === 'ios' ? { sheetGrabberVisible: true } : {}),
        }}
      />
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          {!isOnline && dsarBanner ? (
            <Banner variant="offline" message={t('settingsDsarOffline')} />
          ) : null}

          <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
            {t('settingsAppearance')}
          </Text>
          <SegmentedControl
            options={themeOptions}
            value={preference}
            onChange={setPreference}
            accessibilityLabel={t('themeLabel')}
          />

          <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
            {t('settingsLanguage')}
          </Text>
          <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {locales.map((code) => (
              <ListRow
                key={code}
                icon={Globe}
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

          <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
            {t('settingsPrivacy')}
          </Text>
          <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ListRow
              icon={ShieldCheck}
              title={t('settingsManageConsent')}
              onPress={() => router.push('/onboarding/consent')}
            />
            <ListRow
              icon={Download}
              title={t('settingsExportData')}
              onPress={() => dsarAction('export')}
            />
            <ListRow
              icon={Trash2}
              title={t('settingsDeleteData')}
              destructive
              onPress={() => dsarAction('delete')}
            />
          </View>

          <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
            {t('settingsAbout')}
          </Text>
          <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ListRow title={t('settingsVersion')} trailing={<Text style={{ color: theme.muted }}>{appVersion}</Text>} showChevron={false} />
            <ListRow title={islandName} showChevron={false} />
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  sectionLabel: { marginTop: space['2xl'], marginBottom: space.sm },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
