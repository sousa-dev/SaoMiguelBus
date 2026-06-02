import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import '@/lib/dev-logging';

import { ConsentGate } from '@/components/ConsentGate';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import '@/lib/i18n';
import { AppQueryProvider } from '@/lib/query-provider';
import { ThemeProvider } from '@/lib/theme';
import { track } from '@/lib/analytics';
import { useConsentStore } from '@/lib/consent-store';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { data: bootstrap } = useBootstrap();
  const hasAnalytics = useConsentStore((s) => s.hasAnalyticsConsent());

  useEffect(() => {
    if (hasAnalytics) {
      track('transit', 'load', { surface: 'app_shell' });
    }
  }, [hasAnalytics]);

  return (
    <ThemeProvider bootstrap={bootstrap ?? null}>
      <ConsentGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding/consent" options={{ presentation: 'modal' }} />
        </Stack>
      </ConsentGate>
    </ThemeProvider>
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
