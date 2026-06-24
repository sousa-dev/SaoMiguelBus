import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';

import { resolveInAppReviewConfig } from '@/features/app-review/lib/in-app-review-config';

export { resolveInAppReviewConfig } from '@/features/app-review/lib/in-app-review-config';

export function useInAppReviewConfig() {
  const { data: bootstrap } = useBootstrapCached();
  return resolveInAppReviewConfig(bootstrap);
}
