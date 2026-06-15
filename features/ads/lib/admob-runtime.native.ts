import { getAdMobModule } from '@/features/ads/lib/admob-native';
import {
  getAdMobAppOpenUnitId,
  getAdMobInterstitialUnitId,
  isAdMobSupportedPlatform,
} from '@/config/admob';
import { logger } from '@/lib/logger';

type ClosedListener = () => void;
type InterstitialAdInstance = ReturnType<
  NonNullable<ReturnType<typeof getAdMobModule>>['InterstitialAd']['createForAdRequest']
>;
type AppOpenAdInstance = ReturnType<
  NonNullable<ReturnType<typeof getAdMobModule>>['AppOpenAd']['createForAdRequest']
>;

const APP_OPEN_MAX_AGE_MS = 4 * 60 * 60 * 1000;

let initialized = false;
let initPromise: Promise<void> | null = null;

let interstitial: InterstitialAdInstance | null = null;
let interstitialLoaded = false;
let interstitialShowing = false;
let closedListeners = new Set<ClosedListener>();
let unsubscribeInterstitialLoaded: (() => void) | null = null;
let unsubscribeInterstitialClosed: (() => void) | null = null;
let unsubscribeInterstitialError: (() => void) | null = null;

let appOpen: AppOpenAdInstance | null = null;
let appOpenLoaded = false;
let appOpenLoadTime: number | null = null;
let appOpenShowing = false;
let appOpenClosedListeners = new Set<ClosedListener>();
let unsubscribeAppOpenLoaded: (() => void) | null = null;
let unsubscribeAppOpenClosed: (() => void) | null = null;
let unsubscribeAppOpenError: (() => void) | null = null;

function isAppOpenFresh(nowMs: number): boolean {
  if (!appOpenLoaded || appOpenLoadTime == null) {
    return false;
  }
  return nowMs - appOpenLoadTime < APP_OPEN_MAX_AGE_MS;
}

function attachInterstitialListeners(ad: InterstitialAdInstance): void {
  const mod = getAdMobModule();
  if (!mod) {
    return;
  }

  unsubscribeInterstitialLoaded?.();
  unsubscribeInterstitialClosed?.();
  unsubscribeInterstitialError?.();

  unsubscribeInterstitialLoaded = ad.addAdEventListener(mod.AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });

  unsubscribeInterstitialClosed = ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    interstitialShowing = false;
    for (const listener of closedListeners) {
      listener();
    }
    preloadInterstitialAd();
  });

  unsubscribeInterstitialError = ad.addAdEventListener(mod.AdEventType.ERROR, (error) => {
    interstitialLoaded = false;
    interstitialShowing = false;
    logger.warn('AdMob interstitial error', error);
    preloadInterstitialAd();
  });
}

function attachAppOpenListeners(ad: AppOpenAdInstance): void {
  const mod = getAdMobModule();
  if (!mod) {
    return;
  }

  unsubscribeAppOpenLoaded?.();
  unsubscribeAppOpenClosed?.();
  unsubscribeAppOpenError?.();

  unsubscribeAppOpenLoaded = ad.addAdEventListener(mod.AdEventType.LOADED, () => {
    appOpenLoaded = true;
    appOpenLoadTime = Date.now();
  });

  unsubscribeAppOpenClosed = ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
    appOpenLoaded = false;
    appOpenLoadTime = null;
    appOpenShowing = false;
    for (const listener of appOpenClosedListeners) {
      listener();
    }
    preloadAppOpenAd();
  });

  unsubscribeAppOpenError = ad.addAdEventListener(mod.AdEventType.ERROR, (error) => {
    appOpenLoaded = false;
    appOpenLoadTime = null;
    appOpenShowing = false;
    logger.warn('AdMob app open error', error);
    preloadAppOpenAd();
  });
}

function createInterstitialAd(): InterstitialAdInstance | null {
  const mod = getAdMobModule();
  const unitId = getAdMobInterstitialUnitId();
  if (!mod || !unitId) {
    return null;
  }
  const ad = mod.InterstitialAd.createForAdRequest(unitId);
  attachInterstitialListeners(ad);
  return ad;
}

function createAppOpenAd(): AppOpenAdInstance | null {
  const mod = getAdMobModule();
  const unitId = getAdMobAppOpenUnitId();
  if (!mod || !unitId) {
    return null;
  }
  const ad = mod.AppOpenAd.createForAdRequest(unitId);
  attachAppOpenListeners(ad);
  return ad;
}

export function isAdMobInitialized(): boolean {
  return initialized;
}

export { isAdMobNativeAvailable } from '@/features/ads/lib/admob-native';

export async function initializeAdMob(): Promise<void> {
  const mod = getAdMobModule();
  if (!mod || !isAdMobSupportedPlatform()) {
    return;
  }
  if (initialized) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const consentInfo = await mod.AdsConsent.requestInfoUpdate();
      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === mod.AdsConsentStatus.REQUIRED
      ) {
        await mod.AdsConsent.showForm();
      }
      await mod.MobileAds().initialize();
      initialized = true;
      preloadInterstitialAd();
      preloadAppOpenAd();
    } catch (error) {
      logger.warn('AdMob init failed', error);
      initPromise = null;
    }
  })();

  return initPromise;
}

export function teardownAdMob(): void {
  unsubscribeInterstitialLoaded?.();
  unsubscribeInterstitialClosed?.();
  unsubscribeInterstitialError?.();
  unsubscribeInterstitialLoaded = null;
  unsubscribeInterstitialClosed = null;
  unsubscribeInterstitialError = null;

  unsubscribeAppOpenLoaded?.();
  unsubscribeAppOpenClosed?.();
  unsubscribeAppOpenError?.();
  unsubscribeAppOpenLoaded = null;
  unsubscribeAppOpenClosed = null;
  unsubscribeAppOpenError = null;

  interstitial = null;
  interstitialLoaded = false;
  interstitialShowing = false;
  appOpen = null;
  appOpenLoaded = false;
  appOpenLoadTime = null;
  appOpenShowing = false;
  initialized = false;
  initPromise = null;
  closedListeners.clear();
  appOpenClosedListeners.clear();
}

export function preloadInterstitialAd(): void {
  if (!initialized || !isAdMobSupportedPlatform() || !getAdMobModule()) {
    return;
  }
  if (!interstitial) {
    interstitial = createInterstitialAd();
  }
  if (!interstitial) {
    return;
  }
  interstitialLoaded = false;
  interstitial.load();
}

export function isInterstitialAdLoaded(): boolean {
  return interstitialLoaded;
}

export function isInterstitialShowing(): boolean {
  return interstitialShowing;
}

export function showInterstitialAd(): boolean {
  if (!interstitial || !interstitialLoaded) {
    return false;
  }
  interstitial.show();
  interstitialLoaded = false;
  interstitialShowing = true;
  return true;
}

export function onInterstitialClosed(listener: ClosedListener): () => void {
  closedListeners.add(listener);
  return () => {
    closedListeners.delete(listener);
  };
}

export function preloadAppOpenAd(): void {
  if (!initialized || !isAdMobSupportedPlatform() || !getAdMobModule()) {
    return;
  }
  if (!appOpen) {
    appOpen = createAppOpenAd();
  }
  if (!appOpen) {
    return;
  }
  appOpenLoaded = false;
  appOpenLoadTime = null;
  appOpen.load();
}

export function isAppOpenAdLoaded(nowMs: number = Date.now()): boolean {
  return isAppOpenFresh(nowMs);
}

export function isAppOpenShowing(): boolean {
  return appOpenShowing;
}

export function showAppOpenAd(): boolean {
  if (!appOpen || !isAppOpenAdLoaded()) {
    return false;
  }
  appOpen.show();
  appOpenLoaded = false;
  appOpenLoadTime = null;
  appOpenShowing = true;
  return true;
}

export function onAppOpenClosed(listener: ClosedListener): () => void {
  appOpenClosedListeners.add(listener);
  return () => {
    appOpenClosedListeners.delete(listener);
  };
}

export function isFullScreenAdActive(): boolean {
  return interstitialShowing || appOpenShowing;
}
