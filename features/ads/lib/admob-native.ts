import { NativeModules } from 'react-native';

import { logger } from '@/lib/logger';

type AdMobModule = typeof import('react-native-google-mobile-ads');

let moduleRef: AdMobModule | null | undefined;

function hasNativeModule(): boolean {
  return Boolean(
    (NativeModules as Record<string, unknown>).RNGoogleMobileAdsModule ??
      (NativeModules as Record<string, unknown>).RNGoogleMobileAdsAppOpenModule,
  );
}

/**
 * Load the AdMob SDK only when the native module exists (dev client / store build).
 * Returns null in Expo Go so the app keeps running with first-party ads only.
 */
export function getAdMobModule(): AdMobModule | null {
  if (moduleRef !== undefined) {
    return moduleRef;
  }

  if (!hasNativeModule()) {
    moduleRef = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    moduleRef = require('react-native-google-mobile-ads') as AdMobModule;
    return moduleRef;
  } catch (error) {
    logger.debug('AdMob JS module failed to load', error);
    moduleRef = null;
    return null;
  }
}

export function isAdMobNativeAvailable(): boolean {
  return getAdMobModule() != null;
}
