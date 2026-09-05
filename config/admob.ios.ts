import ADMOB_DEFAULTS from '@/config/admob-defaults';

/** Google sample ad units — safe for dev / simulator builds. */
const TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/5575463023',
  rewarded: 'ca-app-pub-3940256099942544/1712485313',
  native: 'ca-app-pub-3940256099942544/3986624511',
  // Google publishes no separate "small" native sample — the plain one serves
  // the same creatives the compact card renders without media.
  nativeSmall: 'ca-app-pub-3940256099942544/3986624511',
} as const;

/**
 * Every `EXPO_PUBLIC_*` read below MUST stay a literal
 * `process.env.EXPO_PUBLIC_…` member expression. `babel-preset-expo` inlines
 * only static member expressions; a dynamic `process.env[key]` lookup survives
 * into the bundle and evaluates to `undefined` at runtime, so release builds
 * silently fall through to {@link ADMOB_DEFAULTS}.
 */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function isAdMobSupportedPlatform(): boolean {
  return true;
}

export function getAdMobBannerUnitId(): string | null {
  if (__DEV__) {
    return TEST.banner;
  }
  return clean(process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS) ?? ADMOB_DEFAULTS.bannerIos;
}

export function getAdMobInterstitialUnitId(): string | null {
  if (__DEV__) {
    return TEST.interstitial;
  }
  return clean(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS) ?? ADMOB_DEFAULTS.interstitialIos;
}

export function getAdMobAppOpenUnitId(): string | null {
  if (__DEV__) {
    return TEST.appOpen;
  }
  return clean(process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_IOS) ?? ADMOB_DEFAULTS.appOpenIos;
}

export function getAdMobRewardedUnitId(): string | null {
  if (__DEV__) {
    return TEST.rewarded;
  }
  return (
    clean(process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS) ?? clean(ADMOB_DEFAULTS.rewardedIos) ?? null
  );
}

export function getAdMobNativeUnitId(): string | null {
  if (__DEV__) {
    return TEST.native;
  }
  return clean(process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS) ?? ADMOB_DEFAULTS.nativeIos;
}

export function getAdMobNativeSmallUnitId(): string | null {
  if (__DEV__) {
    return TEST.nativeSmall;
  }
  return clean(process.env.EXPO_PUBLIC_ADMOB_NATIVE_SMALL_IOS) ?? ADMOB_DEFAULTS.nativeSmallIos;
}

export const ADMOB_APP_IDS = {
  android: clean(process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID) ?? ADMOB_DEFAULTS.appIdAndroid,
  ios: clean(process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS) ?? ADMOB_DEFAULTS.appIdIos,
} as const;
