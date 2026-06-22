import { Linking } from 'react-native';

/** Open GetYourGuide in the device default browser (preserves logins/cookies). */
export function openHopOnOffExternal(url: string): void {
  void Linking.openURL(url);
}
