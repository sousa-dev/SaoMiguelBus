import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/lib/dev-logging';

import { AppSidebar } from '@/components/AppSidebar';
import { ConsentGate } from '@/components/ConsentGate';
import { GlobalFab } from '@/components/GlobalFab';
import { GlobalOfflineBanner } from '@/components/GlobalOfflineBanner';
import { PremiumOfflinePrompt } from '@/components/PremiumOfflinePrompt';
import { useEntitlementSync } from '@/features/account/hooks/useEntitlement';
import { useRevenueCatBootstrap } from '@/features/premium/hooks/useRevenueCatBootstrap';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useAuthStore } from '@/lib/auth-store';
import '@/lib/i18n';
import { loadSavedLocale } from '@/lib/locale-prefs';
import i18n, { normalizeLocaleCode, resources } from '@/lib/i18n';
import { NetworkProvider } from '@/lib/network-provider';
import { AppQueryProvider } from '@/lib/query-provider';
import { ThemeProvider, useAppTheme } from '@/lib/theme';
import { track } from '@/lib/analytics';
import { useConsentStore } from '@/lib/consent-store';
import { rehydrateThemePrefs } from '@/lib/theme-prefs';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AppStatusBar() {
  const theme = useAppTheme();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} />;
}

function AppShell() {
  const { data: bootstrap } = useBootstrap();
  const hasAnalytics = useConsentStore((s) => s.hasAnalyticsConsent());
  const storedPolicyVersion = useConsentStore((s) => s.policyVersion);
  const requireReconsent = useConsentStore((s) => s.requireReconsent);

  // Load the secure auth token at boot, then keep entitlement in sync.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);
  useEntitlementSync();
  useRevenueCatBootstrap();

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
        </ConsentGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppQueryProvider>
      <NetworkProvider>
        <AppShell />
      </NetworkProvider>
    </AppQueryProvider>
  );
}
