import {
  AppWindow,
  CalendarClock,
  Download,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
  Trash2,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View, InteractionManager } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AccountSection } from '@/features/account/components/AccountSection';
import { useAdsDevStore } from '@/features/ads/lib/ads-dev-store';
import { useAdFreeStore } from '@/features/ads/lib/ad-free-store';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import {
  refreshAdPrivacyOptionsRequired,
  showAdPrivacyOptionsForm,
} from '@/features/ads/lib/admob-runtime';
import { isAdMobNativeAvailable } from '@/features/ads/lib/admob-native';
import { PremiumSettingsSection } from '@/features/premium/components/PremiumSettingsSection';
import { useInAppReviewConfig } from '@/features/app-review/hooks/useInAppReviewConfig';
import { maybeRequestAppReview } from '@/features/app-review/lib/maybe-request-app-review';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Screen } from '@/components/Screen';
import { Banner } from '@/components/ui/Banner';
import { ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import type { SimulatedPhase } from '@/features/transit/lib/schedule-config';
import {
  useCanSimulateSchedule,
  useScheduleDevStore,
} from '@/features/transit/lib/schedule-dev-store';
import { useAuthStore } from '@/lib/auth-store';
import { deleteMyData, exportMyData } from '@/lib/api';
import { confirmAction, notify } from '@/lib/confirm';
import { defaultPurposes, useConsentStore } from '@/lib/consent-store';
import { shareJsonExport } from '@/lib/data-export';
import { resolvePickerLocales } from '@/lib/i18n';
import { LEGAL_URLS } from '@/lib/legal-urls';
import { saveLocale } from '@/lib/locale-prefs';
import { useNetworkStatus } from '@/lib/network-status';
import { useSplashDevStore } from '@/features/splash/splash-dev-store';
import { usePremiumStore } from '@/lib/premium-store';
import { useProfileStore } from '@/lib/profile-store';
import { usePersonalizationStore } from '@/lib/personalization-store';
import { getOrCreateSessionId } from '@/lib/session';
import { space, typography } from '@/lib/tokens';
import { type ThemePreference, useThemePrefsStore } from '@/lib/theme-prefs';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { useAppTheme } from '@/lib/theme';
import { staticIslandConfig } from '@/config/island';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const screenOptions = useAppStackScreenOptions();
  const { isOnline } = useNetworkStatus();
  const { data: bootstrap } = useBootstrapCached();
  const locales = resolvePickerLocales(bootstrap?.island?.locales);
  const islandName = bootstrap?.island?.name ?? staticIslandConfig.islandName;
  const preference = useThemePrefsStore((s) => s.preference);
  const setPreference = useThemePrefsStore((s) => s.setPreference);
  const premiumDevOverride = usePremiumStore((s) => s.devOverride);
  const setPremiumDevOverride = usePremiumStore((s) => s.setDevOverride);
  const forceInternalAds = useAdsDevStore((s) => s.forceInternalAdsFallback);
  const setForceInternalAds = useAdsDevStore((s) => s.setForceInternalAdsFallback);
  const resetAdFreeWindow = useAdFreeStore((s) => s.resetAdFreeWindow);
  const requestSplashPreview = useSplashDevStore((s) => s.requestPreview);
  const canSimulateSchedule = useCanSimulateSchedule();
  const simulatedPhase = useScheduleDevStore((s) => s.simulatedPhase);
  const setSimulatedPhase = useScheduleDevStore((s) => s.setSimulatedPhase);
  const reviewConfig = useInAppReviewConfig();
  const [dsarBanner, setDsarBanner] = useState(false);
  const [dsarBusy, setDsarBusy] = useState<null | 'export' | 'delete'>(null);
  const [adPrivacyOptionsRequired, setAdPrivacyOptionsRequired] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void useAuthStore.getState().refreshUser();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!isAdMobNativeAvailable()) {
        setAdPrivacyOptionsRequired(false);
        return;
      }
      let active = true;
      void refreshAdPrivacyOptionsRequired().then((required) => {
        if (active) {
          setAdPrivacyOptionsRequired(required);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...screenOptions,
      headerShown: true,
      presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
      ...(Platform.OS === 'ios'
        ? {
            sheetGrabberVisible: true,
            sheetAllowedDetents: [1],
            sheetExpandsWhenScrolledToEdge: true,
          }
        : {}),
    });
  }, [navigation, screenOptions, t]);

  const changeLanguage = async (code: string) => {
    await saveLocale(code);
    await i18n.changeLanguage(code);
  };

  const onThemeChange = (value: ThemePreference) => {
    setPreference(value);
    void Haptics.selectionAsync();
  };

  const themeOptions = [
    { value: 'system' as ThemePreference, label: t('themeSystem') },
    { value: 'light' as ThemePreference, label: t('themeLight') },
    { value: 'dark' as ThemePreference, label: t('themeDark') },
  ];

  const schedulePhaseOptions = [
    { value: 'off' as SimulatedPhase, label: t('settingsSimulateCutoverOff') },
    { value: 'live' as SimulatedPhase, label: t('settingsSimulateCutoverLive') },
    { value: 'settled' as SimulatedPhase, label: t('settingsSimulateCutoverSettled') },
  ];

  const exportData = async () => {
    if (!isOnline) {
      setDsarBanner(true);
      return;
    }
    setDsarBusy('export');
    try {
      const sessionId = await getOrCreateSessionId();
      const server = await exportMyData(sessionId);
      const profile = useProfileStore.getState();
      const consent = useConsentStore.getState();
      const payload = {
        exportedAt: new Date().toISOString(),
        island: staticIslandConfig.islandKey,
        server,
        device: {
          displayName: profile.displayName,
          favoriteRoutes: profile.favoriteRoutes,
          favoriteStops: profile.favoriteStops,
          recentSearches: profile.recentSearches,
          votes: profile.votes,
          tracking: profile.tracking,
          consent: {
            decided: consent.decided,
            purposes: consent.purposes,
            policyVersion: consent.policyVersion,
          },
        },
      };
      await shareJsonExport('saomiguelhub-data-export.json', payload, t('settingsExportData'));
    } catch {
      notify(t('settingsDataExportErrorTitle'), t('settingsDataExportError'));
    } finally {
      setDsarBusy(null);
    }
  };

  const deleteData = async () => {
    if (!isOnline) {
      setDsarBanner(true);
      return;
    }
    const confirmed = await confirmAction({
      title: t('settingsDeleteDataConfirmTitle'),
      message: t('settingsDeleteDataConfirmMessage'),
      confirmLabel: t('settingsDeleteDataConfirm'),
      cancelLabel: t('cancel'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    setDsarBusy('delete');
    try {
      const sessionId = await getOrCreateSessionId();
      await deleteMyData(sessionId);
      // Wipe on-device data and reset consent to the protective default (consent
      // was erased server-side). We keep `decided` so the consent gate doesn't
      // redirect — re-arming it here while the Settings modal is open loops.
      useProfileStore.getState().resetAll();
      usePersonalizationStore.getState().resetAll();
      useConsentStore.getState().setPurposes(defaultPurposes);
      notify(t('settingsDataDeletedTitle'), t('settingsDataDeleted'));
    } catch {
      notify(t('settingsDataDeleteErrorTitle'), t('settingsDataDeleteError'));
    } finally {
      setDsarBusy(null);
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '5.1.6';

  const openAdPrivacyOptions = () => {
    void (async () => {
      if (Platform.OS === 'ios') {
        router.back();
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
      }

      const outcome = await showAdPrivacyOptionsForm();
      switch (outcome) {
        case 'shown':
          break;
        case 'not_required':
          notify(
            t('settingsAdPreferencesUnavailableTitle'),
            t('settingsAdPreferencesUnavailableMessage'),
          );
          break;
        case 'unavailable':
        case 'error':
          notify(t('settingsAdPreferencesErrorTitle'), t('settingsAdPreferencesErrorMessage'));
          break;
        default: {
          const _exhaustive: never = outcome;
          return _exhaustive;
        }
      }
    })();
  };

  return (
    <Screen withStackHeader collapsable={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <ScreenTopAdBanner embedded />
        {!isOnline && dsarBanner ? (
          <Banner variant="offline" message={t('settingsDsarOffline')} />
        ) : null}

        <AccountSection />

        <PremiumSettingsSection />

        <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
          {t('settingsAppearance')}
        </Text>
        <SegmentedControl
          options={themeOptions}
          value={preference}
          onChange={onThemeChange}
          accessibilityLabel={t('themeLabel')}
        />

        <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
          {t('settingsLanguage')}
        </Text>
        <LanguagePicker locales={locales} activeLocale={i18n.language} onSelect={changeLanguage} />

        <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
          {t('settingsPrivacy')}
        </Text>
        <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ListRow
            icon={ShieldCheck}
            title={t('settingsManageConsent')}
            onPress={() => router.push('/onboarding/consent')}
          />
          {adPrivacyOptionsRequired ? (
            <ListRow
              icon={Megaphone}
              title={t('settingsManageAdPreferences')}
              onPress={openAdPrivacyOptions}
            />
          ) : null}
          <ListRow
            icon={Download}
            title={t('settingsExportData')}
            disabled={dsarBusy !== null}
            onPress={() => void exportData()}
          />
          <ListRow
            icon={Trash2}
            title={t('settingsDeleteData')}
            subtitle={t('settingsDeleteDataSubtitle')}
            destructive
            disabled={dsarBusy !== null}
            onPress={() => void deleteData()}
          />
        </View>

        {/* Gated on superuser OR __DEV__ — same audience as marketplace
            moderation — rather than on __DEV__ alone, because the point is to
            rehearse the changeover against the REAL server from a release
            build. `useSimulatedPhase` re-applies this gate at the read side,
            so a stored override cannot outlive the account that set it. */}
        {canSimulateSchedule ? (
          <>
            <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
              {t('settingsSimulateCutoverTitle')}
            </Text>
            <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ListRow
                icon={CalendarClock}
                title={t('settingsSimulateCutover')}
                subtitle={t('settingsSimulateCutoverHint')}
                showChevron={false}
              />
            </View>
            <View style={styles.simulateControl}>
              <SegmentedControl
                options={schedulePhaseOptions}
                value={simulatedPhase}
                onChange={(value) => {
                  setSimulatedPhase(value);
                  void Haptics.selectionAsync();
                }}
                accessibilityLabel={t('settingsSimulateCutover')}
              />
            </View>
            {simulatedPhase !== 'off' ? (
              <Banner variant="warning" message={t('settingsSimulateCutoverActive')} />
            ) : null}
          </>
        ) : null}

        {__DEV__ ? (
          <>
            <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
              {t('settingsDeveloper')}
            </Text>
            <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ListRow
                icon={Sparkles}
                title={t('settingsPremiumToggle')}
                subtitle={t('settingsPremiumToggleHint')}
                showChevron={false}
                trailing={
                  <Switch
                    value={premiumDevOverride}
                    onValueChange={(value) => {
                      setPremiumDevOverride(value);
                      void Haptics.selectionAsync();
                    }}
                  />
                }
              />
              <ListRow
                icon={Megaphone}
                title={t('settingsForceInternalAdsToggle')}
                subtitle={t('settingsForceInternalAdsToggleHint')}
                showChevron={false}
                trailing={
                  <Switch
                    value={forceInternalAds}
                    onValueChange={(value) => {
                      setForceInternalAds(value);
                      void Haptics.selectionAsync();
                    }}
                  />
                }
              />
              <ListRow
                icon={TimerReset}
                title={t('settingsResetAdFreeWindow')}
                subtitle={t('settingsResetAdFreeWindowHint')}
                onPress={() => {
                  void resetAdFreeWindow().then(() => {
                    notify(t('settingsResetAdFreeWindowDoneTitle'), t('settingsResetAdFreeWindowDone'));
                  });
                }}
              />
              <ListRow
                icon={AppWindow}
                title={t('settingsShowSplash')}
                subtitle={t('settingsShowSplashHint')}
                onPress={() => {
                  requestSplashPreview();
                  void Haptics.selectionAsync();
                }}
              />
            </View>
          </>
        ) : null}

        <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
          {t('settingsAbout')}
        </Text>
        <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ListRow
            title={t('settingsVersion')}
            trailing={<Text style={{ color: theme.muted }}>{appVersion}</Text>}
            showChevron={false}
          />
          <ListRow title={islandName} showChevron={false} />
          <ListRow
            title={t('termsAndConditions')}
            onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
          />
          <ListRow
            title={t('privacyPolicy')}
            onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
          />
          {reviewConfig.enabled ? (
            <ListRow
              icon={Star}
              title={t('rateApp')}
              onPress={() =>
                void maybeRequestAppReview({
                  trigger: 'settings_manual',
                  inAppReviewEnabled: reviewConfig.enabled,
                  storeUrls: reviewConfig.storeUrls,
                })
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  sectionLabel: { marginTop: space['2xl'], marginBottom: space.sm },
  simulateControl: { marginTop: space.sm, marginBottom: space.sm },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
