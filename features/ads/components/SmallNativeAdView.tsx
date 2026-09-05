type Props = {
  on: string;
  slot?: string | number;
};

/**
 * Web stub. AdMob has no native-ad SDK in the browser, and `useAd` never
 * resolves the `admob` tier on web anyway — but this file is the compile-time
 * contract every importer resolves to, same as AdMobNativeAd.tsx's stub.
 */
export function SmallNativeAdView(_props: Props) {
  return null;
}
