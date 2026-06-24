import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { createNativeSplashHideGuard } from '@/features/splash/branded-splash-theme';
import { useSplashDevStore } from '@/features/splash/splash-dev-store';

export function resolveSplashOverlayVisible(options: {
  fontsLoaded: boolean;
  splashDismissed: boolean;
  devPreviewVisible: boolean;
}): boolean {
  const { fontsLoaded, splashDismissed, devPreviewVisible } = options;
  return fontsLoaded && (!splashDismissed || devPreviewVisible);
}

export function useBrandedSplash(fontsLoaded: boolean) {
  const [splashDismissed, setSplashDismissed] = useState(false);
  const [devPreviewVisible, setDevPreviewVisible] = useState(false);
  const previewRequestId = useSplashDevStore((state) => state.previewRequestId);
  const nativeHideGuardRef = useRef(createNativeSplashHideGuard());

  useEffect(() => {
    if (!__DEV__ || previewRequestId === 0) {
      return;
    }
    setDevPreviewVisible(true);
  }, [previewRequestId]);

  const dismissSplash = useCallback(() => {
    setSplashDismissed(true);
  }, []);

  const dismissDevPreview = useCallback(() => {
    setDevPreviewVisible(false);
  }, []);

  const onOverlayLayout = useCallback(() => {
    if (devPreviewVisible) {
      return;
    }
    const guard = nativeHideGuardRef.current;
    if (!guard.shouldHide()) {
      return;
    }
    guard.markHidden();
    void SplashScreen.hideAsync();
  }, [devPreviewVisible]);

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
    overlayVisible: resolveSplashOverlayVisible({
      fontsLoaded,
      splashDismissed,
      devPreviewVisible,
    }),
    devPreviewVisible,
    dismissSplash,
    dismissDevPreview,
    onOverlayLayout,
    hideNativeForWeb,
  };
}
