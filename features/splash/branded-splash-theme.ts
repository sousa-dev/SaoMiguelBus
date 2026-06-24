import { staticIslandConfig } from '@/config/island';

export type SplashColorScheme = 'light' | 'dark';

export interface BrandedSplashTheme {
  background: string;
  text: string;
  textMuted: string;
  indicator: string;
  outlineOpacity: number;
}

const SPLASH_DARK_BG = '#0f1a12';

export function resolveSplashTheme(
  scheme: SplashColorScheme | null | undefined,
): BrandedSplashTheme {
  if (scheme === 'dark') {
    return {
      background: SPLASH_DARK_BG,
      text: '#f5f5f5',
      textMuted: 'rgba(245, 245, 245, 0.75)',
      indicator: 'rgba(245, 245, 245, 0.6)',
      outlineOpacity: 0.4,
    };
  }

  return {
    background: staticIslandConfig.primaryColor,
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.85)',
    indicator: 'rgba(255, 255, 255, 0.6)',
    outlineOpacity: 0.45,
  };
}

/** Returns whether the native splash should be hidden (once-only guard). */
export function shouldHideNativeSplash(alreadyHidden: boolean): boolean {
  return !alreadyHidden;
}

export function resolveSplashOverlayVisible(options: {
  fontsLoaded: boolean;
  splashDismissed: boolean;
  devPreviewVisible: boolean;
}): boolean {
  const { fontsLoaded, splashDismissed, devPreviewVisible } = options;
  return fontsLoaded && (!splashDismissed || devPreviewVisible);
}

export function createSplashDismissGuard(): {
  isDismissed: () => boolean;
  dismiss: () => boolean;
} {
  let dismissed = false;

  return {
    isDismissed(): boolean {
      return dismissed;
    },
    dismiss(): boolean {
      if (dismissed) {
        return false;
      }
      dismissed = true;
      return true;
    },
  };
}

export function createNativeSplashHideGuard(): {
  shouldHide: () => boolean;
  markHidden: () => void;
} {
  let hidden = false;

  return {
    shouldHide(): boolean {
      return !hidden;
    },
    markHidden(): void {
      hidden = true;
    },
  };
}
