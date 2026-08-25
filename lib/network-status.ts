import { useNetwork } from '@/lib/network-provider';

/**
 * Backwards-compatible shim. Existing consumers read `{ isOnline }`; richer
 * offline-capability state lives in `useNetwork()` (NetworkProvider).
 */
export function useNetworkStatus() {
  const { isOnline } = useNetwork();
  return { isOnline };
}
