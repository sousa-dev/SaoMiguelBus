import ADMOB_DEFAULTS from '@/config/admob-defaults';

/** Google sample ad units — safe for dev / simulator builds. */
const TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/5575463023',
  rewarded: 'ca-app-pub-3940256099942544/1712485313',
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
  return env('EXPO_PUBLIC_ADMOB_BANNER_IOS') ?? ADMOB_DEFAULTS.bannerIos;
}

export function getAdMobInterstitialUnitId(): string | null {
  if (__DEV__) {
    return TEST.interstitial;
  }
  return env('EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS') ?? ADMOB_DEFAULTS.interstitialIos;
}

export function getAdMobAppOpenUnitId(): string | null {
  if (__DEV__) {
    return TEST.appOpen;
  }
  return env('EXPO_PUBLIC_ADMOB_APP_OPEN_IOS') ?? ADMOB_DEFAULTS.appOpenIos;
}

export function getAdMobRewardedUnitId(): string | null {
  if (__DEV__) {
    return TEST.rewarded;
  }
  const id = env('EXPO_PUBLIC_ADMOB_REWARDED_IOS') ?? ADMOB_DEFAULTS.rewardedIos;
  return id?.trim() ? id : null;
}

export const ADMOB_APP_IDS = {
  android: env('EXPO_PUBLIC_ADMOB_APP_ID_ANDROID') ?? ADMOB_DEFAULTS.appIdAndroid,
  ios: env('EXPO_PUBLIC_ADMOB_APP_ID_IOS') ?? ADMOB_DEFAULTS.appIdIos,
} as const;
