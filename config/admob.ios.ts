/** Google sample ad units — safe for dev / simulator builds. */
const TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/5575463023',
} as const;

/** Production defaults from legacy São Miguel Bus Android AdMob account. */
const PROD_DEFAULTS = {
  androidBanner: 'ca-app-pub-8246676797736648/2987068957',
  androidInterstitial: 'ca-app-pub-8246676797736648/2058592053',
  iosBanner: 'ca-app-pub-8246676797736648/2987068957',
  iosInterstitial: 'ca-app-pub-8246676797736648/2058592053',
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
  return env('EXPO_PUBLIC_ADMOB_BANNER_IOS') ?? PROD_DEFAULTS.iosBanner;
}

export function getAdMobInterstitialUnitId(): string | null {
  if (__DEV__) {
    return TEST.interstitial;
  }
  return env('EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS') ?? PROD_DEFAULTS.iosInterstitial;
}

export function getAdMobAppOpenUnitId(): string | null {
  if (__DEV__) {
    return TEST.appOpen;
  }
  return env('EXPO_PUBLIC_ADMOB_APP_OPEN_IOS') ?? PROD_DEFAULTS.iosInterstitial;
}

export const ADMOB_APP_IDS = {
  android: env('EXPO_PUBLIC_ADMOB_APP_ID_ANDROID') ?? 'ca-app-pub-8246676797736648~5996375679',
  ios: env('EXPO_PUBLIC_ADMOB_APP_ID_IOS') ?? 'ca-app-pub-8246676797736648~5996375679',
} as const;
