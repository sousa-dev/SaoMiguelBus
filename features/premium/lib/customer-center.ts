import RevenueCatUI from 'react-native-purchases-ui';

import { logger } from '@/lib/logger';

/** Present the RevenueCat Customer Center. Returns false on failure so callers can fall back. */
export async function presentCustomerCenter(): Promise<boolean> {
  try {
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch (error) {
    logger.error('CustomerCenter: present failed', error);
    return false;
  }
}
