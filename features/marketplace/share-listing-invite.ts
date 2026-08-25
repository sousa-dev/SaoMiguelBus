import { Alert, Platform, Share } from 'react-native';

import { track } from '@/lib/analytics';

export const MARKETPLACE_REGISTER_URL = 'https://servicos.saomiguelhub.com';

export async function shareMarketplaceListingInvite(
  message: string,
  options?: { title?: string; alertTitle?: string },
): Promise<void> {
  track('marketplace', 'share', { action: 'invite_register' });
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: options?.title,
        text: message,
        url: MARKETPLACE_REGISTER_URL,
      });
      return;
    }
    await Share.share({ message, title: options?.title });
  } catch {
    if (Platform.OS === 'web' && options?.alertTitle) {
      Alert.alert(options.alertTitle, message);
    }
  }
}
