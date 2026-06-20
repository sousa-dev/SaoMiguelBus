import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '5.1.4';
}
