import type { RequestOptions } from 'react-native-google-mobile-ads';

/**
 * Ad request options while Google UMP is active. UMP writes the IAB TCF string
 * and GMA selects personalized vs NPA automatically — do not set
 * `requestNonPersonalizedAdsOnly` here or ads may stay NPA permanently.
 */
export function getAdMobRequestOptions(): RequestOptions {
  return {};
}
