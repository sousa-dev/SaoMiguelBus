import { Linking } from 'react-native';

/** Fallback affiliate link when tours API is unavailable. */
export const VIATOR_FALLBACK_URL =
  'https://www.viator.com/?pid=P00222801&mcid=42383&medium=link&medium_version=selector&campaign=sao-miguel-tours';

/** Open Viator in the device default browser (preserves logins/cookies). */
export function openViatorExternal(url: string): void {
  void Linking.openURL(url);
}
