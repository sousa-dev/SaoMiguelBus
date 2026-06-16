import { getAdMobRequestOptions } from '@/features/ads/lib/admob-request-options';
import { AdLoadScheduler } from '@/features/ads/lib/admob-load-backoff';
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
let umpCanRequestAds = false;

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

const interstitialScheduler = new AdLoadScheduler({
  onLoad: () => {
    if (!initialized || !isAdMobSupportedPlatform() || !getAdMobModule()) {
      interstitialScheduler.markLoadSettled();
      return;
    }
    if (!interstitial) {
      interstitial = createInterstitialAd();
    }
    if (!interstitial) {
      interstitialScheduler.markLoadSettled();
      return;
    }
    interstitialLoaded = false;
    interstitial.load();
  },
});

const appOpenScheduler = new AdLoadScheduler({
  onLoad: () => {
    if (!initialized || !isAdMobSupportedPlatform() || !getAdMobModule()) {
      appOpenScheduler.markLoadSettled();
      return;
    }
    if (!appOpen) {
      appOpen = createAppOpenAd();
    }
    if (!appOpen) {
      appOpenScheduler.markLoadSettled();
      return;
    }
    appOpenLoaded = false;
    appOpenLoadTime = null;
    appOpen.load();
  },
});

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
    interstitialScheduler.markLoadSucceeded();
  });

  unsubscribeInterstitialClosed = ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    interstitialShowing = false;
    for (const listener of closedListeners) {
      listener();
    }
    interstitialScheduler.requestImmediateLoad();
  });

  unsubscribeInterstitialError = ad.addAdEventListener(mod.AdEventType.ERROR, (error) => {
    interstitialLoaded = false;
    interstitialShowing = false;
    logger.warn('AdMob interstitial error', error);
    interstitialScheduler.markLoadSettled();
    interstitialScheduler.scheduleRetryAfterError();
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
    appOpenScheduler.markLoadSucceeded();
  });

  unsubscribeAppOpenClosed = ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
    appOpenLoaded = false;
    appOpenLoadTime = null;
    appOpenShowing = false;
    for (const listener of appOpenClosedListeners) {
      listener();
    }
    appOpenScheduler.requestImmediateLoad();
  });

  unsubscribeAppOpenError = ad.addAdEventListener(mod.AdEventType.ERROR, (error) => {
    appOpenLoaded = false;
    appOpenLoadTime = null;
    appOpenShowing = false;
    logger.warn('AdMob app open error', error);
    appOpenScheduler.markLoadSettled();
    appOpenScheduler.scheduleRetryAfterError();
  });
}

function createInterstitialAd(): InterstitialAdInstance | null {
  const mod = getAdMobModule();
  const unitId = getAdMobInterstitialUnitId();
  if (!mod || !unitId) {
    return null;
  }
  const requestOptions = getAdMobRequestOptions();
  const ad = mod.InterstitialAd.createForAdRequest(unitId, requestOptions);
  attachInterstitialListeners(ad);
  return ad;
}

function createAppOpenAd(): AppOpenAdInstance | null {
  const mod = getAdMobModule();
  const unitId = getAdMobAppOpenUnitId();
  if (!mod || !unitId) {
    return null;
  }
  const requestOptions = getAdMobRequestOptions();
  const ad = mod.AppOpenAd.createForAdRequest(unitId, requestOptions);
  attachAppOpenListeners(ad);
  return ad;
}

export function isAdMobInitialized(): boolean {
  return initialized;
}

export function isAdMobCanRequestAds(): boolean {
  return umpCanRequestAds;
}

export { isAdMobNativeAvailable } from '@/features/ads/lib/admob-native';

export async function showAdPrivacyOptionsForm(): Promise<void> {
  const mod = getAdMobModule();
  if (!mod || !isAdMobSupportedPlatform()) {
    return;
  }
  try {
    await mod.AdsConsent.showPrivacyOptionsForm();
  } catch (error) {
    logger.warn('AdMob privacy options form failed', error);
  }
}

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

      const updatedConsent = await mod.AdsConsent.getConsentInfo();
      umpCanRequestAds = updatedConsent.canRequestAds;
      if (!umpCanRequestAds) {
        initPromise = null;
        return;
      }

      await mod.MobileAds().initialize();
      initialized = true;
      interstitialScheduler.requestImmediateLoad();
      appOpenScheduler.requestImmediateLoad();
    } catch (error) {
      logger.warn('AdMob init failed', error);
      umpCanRequestAds = false;
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
  umpCanRequestAds = false;
  interstitialScheduler.cancel();
  appOpenScheduler.cancel();
  closedListeners.clear();
  appOpenClosedListeners.clear();
}

export function preloadInterstitialAd(): void {
  if (!initialized || !isAdMobSupportedPlatform() || !getAdMobModule()) {
    return;
  }
  interstitialScheduler.requestImmediateLoad();
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
  appOpenScheduler.requestImmediateLoad();
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
