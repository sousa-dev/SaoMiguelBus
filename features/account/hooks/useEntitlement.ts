import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchEntitlement } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useEntitlementStore } from '@/lib/entitlement-store';
import type { Entitlement } from '@/lib/types';

/**
 * App-wide entitlement sync. Fetches the live entitlement while signed in and
 * mirrors it into the persisted entitlement store (which drives `usePremium`).
 * Mount once near the app root.
 */
export function useEntitlementSync() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const reconcileFromBackend = useEntitlementStore((s) => s.reconcileFromBackend);
  const clearEntitlement = useEntitlementStore((s) => s.clearEntitlement);

  const query = useQuery({
    queryKey: ['billing', 'entitlement', token],
    queryFn: fetchEntitlement,
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Clear only once we know (post-hydration) the user is signed out — avoids
  // wiping the persisted entitlement during the brief pre-hydration window.
  useEffect(() => {
    if (hydrated && !token) {
      clearEntitlement();
    }
  }, [hydrated, token, clearEntitlement]);

  useEffect(() => {
    if (query.data) {
      reconcileFromBackend(query.data);
    }
  }, [query.data, reconcileFromBackend]);

  return query;
}

/** Read the current entitlement (last-known, persisted). */
export function useEntitlement(): Entitlement | null {
  return useEntitlementStore((s) => s.entitlement);
}
