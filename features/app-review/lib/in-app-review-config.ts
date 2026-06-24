import type { BootstrapResponse } from '@/lib/types';

export function resolveInAppReviewConfig(bootstrap?: BootstrapResponse) {
  return {
    enabled: bootstrap?.inAppReviewEnabled === true,
    storeUrls: bootstrap?.storeUrls,
  };
}
