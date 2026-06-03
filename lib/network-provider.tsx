import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import { logger } from '@/lib/logger';
import { flushDrafts } from '@/lib/offline-drafts';
import {
  MIN_SYNC_INTERVAL,
  hasOfflineCache,
  loadCachedBundle,
  refreshOfflineBundleIfStale,
} from '@/lib/offline-bundle';
import { usePremium } from '@/lib/premium-store';

let latestOnline = true;
/** Synchronous online getter for non-React call sites (e.g. mutation guards). */
export function getNetworkOnline(): boolean {
  return latestOnline;
}

/** Debounce window for connectivity transitions to avoid banner flicker. */
const CONNECTIVITY_DEBOUNCE_MS = 700;
/** Background staleness check cadence while the app is foregrounded + premium. */
const BACKGROUND_SYNC_INTERVAL = 1000 * 60 * 60 * 6; // 6h

export interface NetworkContextValue {
  isOnline: boolean;
  isPremium: boolean;
  /** Premium-gated: `false` for non-premium users even if a bundle is cached. */
  hasOfflineBundle: boolean;
  offlineBundleStale: boolean;
  lastSyncAt: number | null;
  syncing: boolean;
  syncNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  isPremium: false,
  hasOfflineBundle: false,
  offlineBundleStale: false,
  lastSyncAt: null,
  syncing: false,
  syncNow: async () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const isPremium = usePremium();
  const queryClient = useQueryClient();

  const [isOnline, setIsOnline] = useState(true);
  const [hasBundle, setHasBundle] = useState(false);
  const [offlineBundleStale, setOfflineBundleStale] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const syncingRef = useRef(false);

  // --- Connectivity (debounced) --- //
  useEffect(() => {
    const applyOnline = (next: boolean) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        latestOnline = next;
        setIsOnline((prev) => (prev === next ? prev : next));
      }, CONNECTIVITY_DEBOUNCE_MS);
    };

    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
      const onOnline = () => applyOnline(true);
      const onOffline = () => applyOnline(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      applyOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => {
      unsubscribe();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // --- Track cached-bundle availability --- //
  const refreshBundleState = useCallback(async () => {
    const cached = await loadCachedBundle();
    setHasBundle(Boolean(cached?.routes?.length));
  }, []);

  useEffect(() => {
    void refreshBundleState();
  }, [refreshBundleState]);

  // --- Premium-gated sync --- //
  const syncNow = useCallback(async () => {
    if (!isPremium || syncingRef.current) {
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    try {
      const { bundle, updated } = await refreshOfflineBundleIfStale();
      lastSyncRef.current = Date.now();
      setLastSyncAt(lastSyncRef.current);
      setHasBundle(Boolean(bundle?.routes?.length));
      setOfflineBundleStale(false);
      if (updated) {
        await queryClient.invalidateQueries({ queryKey: ['transit', 'offline-cache'] });
      }
    } catch (error) {
      logger.warn('offline sync failed', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [isPremium, queryClient]);

  // Sync on premium acquisition, reconnect, and foreground (throttled to MIN_SYNC_INTERVAL).
  useEffect(() => {
    if (!isPremium || !isOnline) {
      return;
    }
    const elapsed = Date.now() - lastSyncRef.current;
    if (elapsed >= MIN_SYNC_INTERVAL || lastSyncRef.current === 0) {
      void syncNow();
    }
  }, [isPremium, isOnline, syncNow]);

  // Periodic background staleness check while foregrounded.
  useEffect(() => {
    if (!isPremium) {
      return;
    }
    const interval = setInterval(() => {
      if (isOnline) {
        void syncNow();
      }
    }, BACKGROUND_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [isPremium, isOnline, syncNow]);

  // Flush queued safety-report drafts when connectivity returns.
  useEffect(() => {
    if (!isOnline) {
      return;
    }
    void flushDrafts().then((flushed) => {
      if (flushed > 0) {
        void queryClient.invalidateQueries({ queryKey: ['seismic'] });
        void queryClient.invalidateQueries({ queryKey: ['traffic'] });
      }
    });
  }, [isOnline, queryClient]);

  // Re-check staleness when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isPremium && isOnline) {
        const elapsed = Date.now() - lastSyncRef.current;
        if (elapsed >= MIN_SYNC_INTERVAL) {
          void syncNow();
        }
      }
    });
    return () => sub.remove();
  }, [isPremium, isOnline, syncNow]);

  const value: NetworkContextValue = {
    isOnline,
    isPremium,
    hasOfflineBundle: isPremium && hasBundle,
    offlineBundleStale,
    lastSyncAt,
    syncing,
    syncNow,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

/** Rich network + offline-capability status. */
export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

export { hasOfflineCache };
