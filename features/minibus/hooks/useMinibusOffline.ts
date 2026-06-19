import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveMinibusApiLocale } from '@/features/minibus/locale';
import {
  MINIBUS_MIN_SYNC_INTERVAL,
  loadCachedSnapshot,
  refreshMinibusSnapshotIfStale,
  type MinibusOfflineSnapshot,
} from '@/features/minibus/offline';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/lib/network-provider';

export interface MinibusOfflineState {
  snapshot: MinibusOfflineSnapshot | null;
  /** A cached snapshot with at least one line is available offline. */
  hasOffline: boolean;
  syncing: boolean;
  syncNow: () => Promise<void>;
}

/**
 * Ungated offline sync for Mini Bus (free for all users — third-party data).
 * Loads the cached snapshot immediately and refreshes it when online, throttled
 * to MINIBUS_MIN_SYNC_INTERVAL. A locale change forces a fresh download.
 */
export function useMinibusOffline(): MinibusOfflineState {
  const { i18n } = useTranslation();
  const locale = resolveMinibusApiLocale(i18n.language);
  const { isOnline } = useNetwork();

  const [snapshot, setSnapshot] = useState<MinibusOfflineSnapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const syncingRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadCachedSnapshot().then((cached) => {
      if (active && cached) {
        setSnapshot(cached);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    try {
      const { snapshot: next } = await refreshMinibusSnapshotIfStale(locale);
      lastSyncRef.current = Date.now();
      if (next) {
        setSnapshot(next);
      }
    } catch (error) {
      logger.warn('minibus offline sync failed', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }
    const elapsed = Date.now() - lastSyncRef.current;
    if (elapsed >= MINIBUS_MIN_SYNC_INTERVAL || lastSyncRef.current === 0) {
      void syncNow();
    }
  }, [isOnline, syncNow]);

  return {
    snapshot,
    hasOffline: Boolean(snapshot?.bundle?.lines?.length),
    syncing,
    syncNow,
  };
}
