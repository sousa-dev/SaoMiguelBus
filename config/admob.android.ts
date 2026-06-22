import ADMOB_DEFAULTS from '@/config/admob-defaults';

/** Google sample ad units — safe for dev / simulator builds. */
const TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/9257395921',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function isAdMobSupportedPlatform(): boolean {
  return true;
}

export function getAdMobBannerUnitId(): string | null {
  if (__DEV__) {
    return TEST.banner;
  }
  return env('EXPO_PUBLIC_ADMOB_BANNER_ANDROID') ?? ADMOB_DEFAULTS.bannerAndroid;
}

export function getAdMobInterstitialUnitId(): string | null {
  if (__DEV__) {
    return TEST.interstitial;
  }
  return env('EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID') ?? ADMOB_DEFAULTS.interstitialAndroid;
}

export function getAdMobAppOpenUnitId(): string | null {
  if (__DEV__) {
    return TEST.appOpen;
  }
  return env('EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID') ?? ADMOB_DEFAULTS.appOpenAndroid;
}

export function getAdMobRewardedUnitId(): string | null {
  if (__DEV__) {
    return TEST.rewarded;
  }
  const id = env('EXPO_PUBLIC_ADMOB_REWARDED_ANDROID') ?? ADMOB_DEFAULTS.rewardedAndroid;
  return id?.trim() ? id : null;
}

export const ADMOB_APP_IDS = {
  android: env('EXPO_PUBLIC_ADMOB_APP_ID_ANDROID') ?? ADMOB_DEFAULTS.appIdAndroid,
  ios: env('EXPO_PUBLIC_ADMOB_APP_ID_IOS') ?? ADMOB_DEFAULTS.appIdIos,
} as const;
