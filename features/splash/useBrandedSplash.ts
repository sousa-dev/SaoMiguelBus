import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { createNativeSplashHideGuard } from '@/features/splash/branded-splash-theme';

export function useBrandedSplash(fontsLoaded: boolean) {
  const [splashDismissed, setSplashDismissed] = useState(false);
  const nativeHideGuardRef = useRef(createNativeSplashHideGuard());

  const dismissSplash = useCallback(() => {
    setSplashDismissed(true);
  }, []);

  const onOverlayLayout = useCallback(() => {
    const guard = nativeHideGuardRef.current;
    if (!guard.shouldHide()) {
      return;
    }
    guard.markHidden();
    void SplashScreen.hideAsync();
  }, []);

  const hideNativeForWeb = useCallback(() => {
    if (Platform.OS !== 'web' || !fontsLoaded) {
      return;
    }
    const guard = nativeHideGuardRef.current;
    if (!guard.shouldHide()) {
      return;
    }
    guard.markHidden();
    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return {
    overlayVisible: fontsLoaded && !splashDismissed,
    dismissSplash,
    onOverlayLayout,
    hideNativeForWeb,
  };
}
