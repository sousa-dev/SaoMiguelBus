import Constants from 'expo-constants';
import { Platform } from 'react-native';

import appConfig from '@/app.json';

export type AnalyticsPlatform = 'ios' | 'android' | 'web';

export function getAnalyticsPlatform(): AnalyticsPlatform {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return 'web';
}

/**
 * The running app's version.
 *
 * `Constants.expoConfig` is null in a prebuilt/bare binary, which is what we
 * ship — so this always fell through to its fallback, and that fallback was a
 * hardcoded '5.1.6' that stopped being true dozens of releases ago. It was not
 * only a wrong label in Settings: this value goes out in the API User-Agent, in
 * analytics, on feedback reports, and to `GET /app/update-check`, where claiming
 * 5.1.6 makes the app look ~50 patches behind every release config — a store
 * prompt on every cold start, and an undismissable sheet wherever that config
 * says `required`.
 *
 * app.json is the same source `expo.version` is built from, and bundling it
 * removes the runtime manifest dependency entirely. It also follows an OTA
 * update the way the JS bundle does, which is what this number should mean.
 */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? appConfig.expo.version;
}
