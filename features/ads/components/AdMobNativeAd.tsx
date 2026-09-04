import React from 'react';

type Props = {
  on: string;
  slot?: string | number;
  fallback?: React.ReactNode;
};

/**
 * Web stub. AdMob has no native-ad SDK in the browser, and `useAd` never
 * resolves the `admob` tier on web anyway — but TypeScript resolves this file
 * for every importer, so it is the compile-time contract for the native one.
 */
export function AdMobNativeAd({ fallback }: Props) {
  return <>{fallback ?? null}</>;
}
