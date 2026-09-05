import ADMOB_DEFAULTS from '@/config/admob-defaults';

/** Google sample ad units — safe for dev / simulator builds. */
const TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/9257395921',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  native: 'ca-app-pub-3940256099942544/2247696110',
  // Google publishes no separate "small" native sample — the plain one serves
  // the same creatives the compact card renders without media.
  nativeSmall: 'ca-app-pub-3940256099942544/2247696110',
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
  return clean(process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID) ?? ADMOB_DEFAULTS.bannerAndroid;
}

export function getAdMobInterstitialUnitId(): string | null {
  if (__DEV__) {
    return TEST.interstitial;
  }
  return (
    clean(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID) ?? ADMOB_DEFAULTS.interstitialAndroid
  );
}

export function getAdMobAppOpenUnitId(): string | null {
  if (__DEV__) {
    return TEST.appOpen;
  }
  return clean(process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID) ?? ADMOB_DEFAULTS.appOpenAndroid;
}

export function getAdMobRewardedUnitId(): string | null {
  if (__DEV__) {
    return TEST.rewarded;
  }
  return (
    clean(process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID) ??
    clean(ADMOB_DEFAULTS.rewardedAndroid) ??
    null
  );
}

export function getAdMobNativeUnitId(): string | null {
  if (__DEV__) {
    return TEST.native;
  }
  return clean(process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID) ?? ADMOB_DEFAULTS.nativeAndroid;
}

export function getAdMobNativeSmallUnitId(): string | null {
  if (__DEV__) {
    return TEST.nativeSmall;
  }
  return (
    clean(process.env.EXPO_PUBLIC_ADMOB_NATIVE_SMALL_ANDROID) ?? ADMOB_DEFAULTS.nativeSmallAndroid
  );
}

export const ADMOB_APP_IDS = {
  android: clean(process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID) ?? ADMOB_DEFAULTS.appIdAndroid,
  ios: clean(process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS) ?? ADMOB_DEFAULTS.appIdIos,
} as const;
