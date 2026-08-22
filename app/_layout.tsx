import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/lib/dev-logging';

import { AppSidebar } from '@/components/AppSidebar';
import { BrandedSplashOverlay } from '@/components/BrandedSplashOverlay';
import { ConsentGate } from '@/components/ConsentGate';
import { GlobalFab } from '@/components/GlobalFab';
import { GlobalOfflineBanner } from '@/components/GlobalOfflineBanner';
import { PremiumOfflinePrompt } from '@/components/PremiumOfflinePrompt';
import { AppUpdatePrompt } from '@/features/app-update/components/AppUpdatePrompt';
import { SaveSubscriptionPrompt } from '@/features/premium/components/SaveSubscriptionPrompt';
import { useAdMobInit } from '@/features/ads/hooks/useAdMobInit';
import { useAdFreeWindowBootstrap } from '@/features/ads/hooks/useAdFreeWindow';
import { useRewardedAdBootstrap } from '@/features/ads/hooks/useRewardedAdBootstrap';
import { AppOpenOrchestrator } from '@/features/ads/components/AppOpenOrchestrator';
import { useBrandedSplash } from '@/features/splash/useBrandedSplash';
import { InterstitialRequestHost } from '@/features/ads/components/InterstitialRequestHost';
import { AdFreeRewardModalHost } from '@/features/ads/components/AdFreeRewardModalHost';
import { HopOnHopOffSheetHost } from '@/features/hop-on-hop-off/components/HopOnHopOffSheetHost';
import { useEntitlementSync } from '@/features/account/hooks/useEntitlement';
import { usePersonalizationPlatformBackfill } from '@/features/account/hooks/usePersonalizationPlatformBackfill';
import { useRevenueCatBootstrap } from '@/features/premium/hooks/useRevenueCatBootstrap';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useAutoTrackPinnedRoutes } from '@/features/transit/hooks/useAutoTrackPinnedRoutes';
import { useEntitlementLapseCancellation } from '@/features/transit/hooks/useEntitlementLapseCancellation';
import { useNotificationPermissionResume } from '@/features/transit/hooks/useNotificationPermissionResume';
import { useNotificationReconcile } from '@/features/transit/hooks/useNotificationReconcile';
import { useNotificationTapRouting } from '@/features/transit/hooks/useNotificationTapRouting';
import { useServiceAnnouncements } from '@/features/transit/hooks/useServiceAnnouncements';
import { useScheduleTransition } from '@/features/transit/hooks/useScheduleTransition';
import { useAuthStore } from '@/lib/auth-store';
import { initNotifications } from '@/lib/notifications/scheduler';
import '@/lib/i18n';
import { loadSavedLocale } from '@/lib/locale-prefs';
import i18n, { normalizeLocaleCode, resources } from '@/lib/i18n';
import { NetworkProvider } from '@/lib/network-provider';
import { AppQueryProvider } from '@/lib/query-provider';
import { ThemeProvider, useAppTheme } from '@/lib/theme';
import { flushAnalytics, track } from '@/lib/analytics';
import { useConsentStore } from '@/lib/consent-store';
import { rehydrateThemePrefs } from '@/lib/theme-prefs';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AppStatusBar() {
  const theme = useAppTheme();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} />;
}

function AppShell({
  appReady,
  onSplashDismiss,
}: {
  appReady: boolean;
  onSplashDismiss: () => void;
}) {
  const { data: bootstrap } = useBootstrap();
  // Invalidate bootstrap, search and stops at the changeover instant the server
  // published — a 24h-persisted config would otherwise still be applied after it
  // stopped being true (03 §1, 98 §4 gap "Stale bootstrap").
  useScheduleTransition(bootstrap?.transitSchedule);
  // Lives here rather than on the transit tab: a rider who opens the app on the
  // hub still expects their 09h15 to be following itself by the time they look.
  useAutoTrackPinnedRoutes();
  // The OS surface has to be live before anything is scheduled against it:
  // Android channels must exist, and the foreground presentation handler must be
  // installed before a notification can land. Once per launch, here rather than
  // lazily on the first arm — where a rider tapping the bell would be racing it.
  useEffect(() => {
    void initNotifications();
  }, []);
  // Once per launch, after the profile store rehydrates: cancel alarms no live
  // track claims, and re-arm tracks the OS has forgotten (04 §6.2).
  useNotificationReconcile();
  // Finishes an arm the rider left to grant permission in system settings, and
  // notices when permission has been taken away while journeys are armed
  // (05 §3.3, §3.4). In the shell so it survives the card being scrolled away.
  useNotificationPermissionResume();
  // Routes a tapped notification, warm or cold-start, once the router exists
  // (05 §6).
  useNotificationTapRouting();
  // Premium alarms stand down when the subscription does — including when it
  // lapsed while the app was closed (06 §3).
  useEntitlementLapseCancellation();
  // In the SHELL, not on the transit screen: this is a nine-module hub, and a
  // rider who opens it for the weather must still have the 1 September warning
  // scheduled (01 §4). The permission row it produces renders on transit.
  useServiceAnnouncements();
  const hasAnalytics = useConsentStore((s) => s.hasAnalyticsConsent());
  const storedPolicyVersion = useConsentStore((s) => s.policyVersion);
  const requireReconsent = useConsentStore((s) => s.requireReconsent);

  // Load token + refresh profile after persist rehydration (avoids stale cached user).
  useEffect(() => {
    const runHydrate = () => {
      void useAuthStore.getState().hydrate();
    };
    if (useAuthStore.persist.hasHydrated()) {
      runHydrate();
      return;
    }
    const unsubscribe = useAuthStore.persist.onFinishHydration(runHydrate);
    void useAuthStore.persist.rehydrate();
    return unsubscribe;
  }, []);
  useEntitlementSync();
  usePersonalizationPlatformBackfill();
  useRevenueCatBootstrap();
  useAdFreeWindowBootstrap();
  useAdMobInit();
  useRewardedAdBootstrap();

  useEffect(() => {
    void rehydrateThemePrefs();
    void loadSavedLocale().then((saved) => {
      if (!saved) {
        return;
      }
      const code = normalizeLocaleCode(saved);
      if (code in resources) {
        void i18n.changeLanguage(code);
      }
    });
  }, []);

  useEffect(() => {
    const serverVersion = bootstrap?.consentPolicyVersion;
    if (!serverVersion || !storedPolicyVersion) {
      return;
    }
    if (storedPolicyVersion !== serverVersion) {
      requireReconsent();
    }
  }, [bootstrap?.consentPolicyVersion, storedPolicyVersion, requireReconsent]);

  useEffect(() => {
    if (hasAnalytics) {
      track('transit', 'load', { surface: 'app_shell' });
    }
  }, [hasAnalytics]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        flushAnalytics();
      }
      if (state === 'active') {
        flushAnalytics();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider bootstrap={bootstrap ?? null}>
        <AppStatusBar />
        <ConsentGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="settings"
              options={{
                presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              }}
            />
            <Stack.Screen
              name="profile"
              options={{
                presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              }}
            />
            <Stack.Screen name="onboarding/consent" options={{ presentation: 'modal' }} />
            <Stack.Screen name="onboarding/personalize" />
            <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="auth/sign-in"
              options={{
                presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              }}
            />
          </Stack>
          <GlobalFab />
          <AppSidebar />
          <GlobalOfflineBanner />
          <PremiumOfflinePrompt />
          <AppUpdatePrompt />
          <SaveSubscriptionPrompt />
          <AdFreeRewardModalHost />
          <InterstitialRequestHost />
          <HopOnHopOffSheetHost />
        </ConsentGate>
        <AppOpenOrchestrator appReady={appReady} onSplashDismiss={onSplashDismiss} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const {
    overlayVisible,
    devPreviewVisible,
    dismissSplash,
    dismissDevPreview,
    onOverlayLayout,
    hideNativeForWeb,
  } = useBrandedSplash(loaded);

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    hideNativeForWeb();
  }, [hideNativeForWeb]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppQueryProvider>
        <NetworkProvider>
          <AppShell appReady={loaded} onSplashDismiss={dismissSplash} />
          <BrandedSplashOverlay
            visible={overlayVisible}
            devPreview={devPreviewVisible}
            onLayout={onOverlayLayout}
            onDevPreviewDismiss={dismissDevPreview}
          />
        </NetworkProvider>
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
