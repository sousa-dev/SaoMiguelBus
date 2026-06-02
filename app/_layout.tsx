import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/lib/dev-logging';

import { ConsentGate } from '@/components/ConsentGate';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import '@/lib/i18n';
import { loadSavedLocale } from '@/lib/locale-prefs';
import i18n, { resources } from '@/lib/i18n';
import { AppQueryProvider } from '@/lib/query-provider';
import { ThemeProvider } from '@/lib/theme';
import { track } from '@/lib/analytics';
import { useConsentStore } from '@/lib/consent-store';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { data: bootstrap } = useBootstrap();
  const hasAnalytics = useConsentStore((s) => s.hasAnalyticsConsent());
  const storedPolicyVersion = useConsentStore((s) => s.policyVersion);
  const requireReconsent = useConsentStore((s) => s.requireReconsent);

  useEffect(() => {
    void loadSavedLocale().then((saved) => {
      if (saved && saved in resources) {
        void i18n.changeLanguage(saved);
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
        <StatusBar style="auto" />
        <ConsentGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="onboarding/consent" options={{ presentation: 'modal' }} />
          </Stack>
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
      <AppShell />
    </AppQueryProvider>
  );
}
