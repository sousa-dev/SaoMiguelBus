/**
 * Side-effect module: wire dev diagnostics once at app boot.
 * Import from app/_layout.tsx before other app code runs.
 */
import { logDevStartupHint, logger } from '@/lib/logger';
import { queryClient } from '@/lib/query-provider';

if (__DEV__ && process.env.EXPO_PUBLIC_DEV_LOGS !== 'false') {
  logDevStartupHint();

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') {
      return;
    }
    const { query, action } = event;
    if (action.type === 'success') {
      logger.debug('[query] ok', query.queryKey);
    }
    if (action.type === 'error') {
      logger.error('[query] fail', query.queryKey, action.error);
    }
  });

  queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== 'updated') {
      return;
    }
    const { mutation, action } = event;
    if (action.type === 'error') {
      logger.error('[mutation] fail', mutation.options.mutationKey, action.error);
    }
  });
}
