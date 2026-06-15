type ClosedListener = () => void;

export function isAdMobInitialized(): boolean {
  return false;
}

export function isAdMobCanRequestAds(): boolean {
  return false;
}

export { isAdMobNativeAvailable } from '@/features/ads/lib/admob-native';

export async function showAdPrivacyOptionsForm(): Promise<void> {}

export async function initializeAdMob(): Promise<void> {}

export function teardownAdMob(): void {}

export function preloadInterstitialAd(): void {}

export function isInterstitialAdLoaded(): boolean {
  return false;
}

export function isInterstitialShowing(): boolean {
  return false;
}

export function showInterstitialAd(): boolean {
  return false;
}

export function onInterstitialClosed(_listener: ClosedListener): () => void {
  return () => {};
}

export function preloadAppOpenAd(): void {}

export function isAppOpenAdLoaded(_nowMs?: number): boolean {
  return false;
}

export function isAppOpenShowing(): boolean {
  return false;
}

export function showAppOpenAd(): boolean {
  return false;
}

export function onAppOpenClosed(_listener: ClosedListener): () => void {
  return () => {};
}

export function isFullScreenAdActive(): boolean {
  return false;
}
