import type { AdPrivacyOptionsOutcome } from '@/features/ads/lib/ad-privacy-options';

type ClosedListener = () => void;

export type RewardedAdShowResult = 'earned' | 'dismissed' | 'unavailable';
export type { AdPrivacyOptionsOutcome } from '@/features/ads/lib/ad-privacy-options';

export function isAdMobInitialized(): boolean {
  return false;
}

export function isAdMobCanRequestAds(): boolean {
  return false;
}

export { isAdMobNativeAvailable } from '@/features/ads/lib/admob-native';

export async function refreshAdPrivacyOptionsRequired(): Promise<boolean> {
  return false;
}

export async function showAdPrivacyOptionsForm(): Promise<AdPrivacyOptionsOutcome> {
  return 'unavailable';
}

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

export function showInterstitialAdAndWait(): Promise<boolean> {
  return Promise.resolve(false);
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

export function preloadRewardedAd(): void {}

export function isRewardedAdLoaded(): boolean {
  return false;
}

export function onRewardedAdLoadStateChanged(_listener: (loaded: boolean) => void): () => void {
  return () => {};
}

export function isRewardedShowing(): boolean {
  return false;
}

export async function showRewardedAd(): Promise<RewardedAdShowResult> {
  return 'unavailable';
}

export function isFullScreenAdActive(): boolean {
  return false;
}
