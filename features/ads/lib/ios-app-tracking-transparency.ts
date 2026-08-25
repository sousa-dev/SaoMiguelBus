import { Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

import { logger } from '@/lib/logger';

export { shouldRequestIosAppTrackingPermission } from '@/features/ads/lib/ios-app-tracking-policy';

export async function requestIosAppTrackingPermissionIfNeeded(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    const { status } = await getTrackingPermissionsAsync();
    if (status === PermissionStatus.UNDETERMINED) {
      await requestTrackingPermissionsAsync();
    }
  } catch (error) {
    logger.warn('iOS App Tracking Transparency request failed', error);
  }
}
