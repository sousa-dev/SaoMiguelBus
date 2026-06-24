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
import { useAuthStore } from '@/lib/auth-store';
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
    return useAuthStore.persist.onFinishHydration(runHydrate);
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
