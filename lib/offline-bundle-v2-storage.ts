/**
 * v2 bundle storage on the filesystem, not AsyncStorage (03 §5.3).
 *
 * `@react-native-async-storage/async-storage@2.2.0` caps the ENTIRE RKStorage
 * SQLite database at 6 MB, and that database is shared with the persisted React
 * Query cache, the profile store and every other consumer. A multi-megabyte
 * bundle is not isolated headroom, and overflow surfaces as opaque write failures
 * or an evicted query cache (98 §5 challenge 2).
 *
 * So: download to a temp file, verify it parses and matches the version we asked
 * for, atomically replace the live file, and roll back if anything fails.
 * AsyncStorage keeps metadata only. Modelled on `features/minibus/offline.ts`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { staticIslandConfig } from '@/config/island';
import { fetchOfflineBundleV2, fetchOfflineBundleV2Version } from '@/lib/api';
import { logger } from '@/lib/logger';
import {
  parseBundle,
  shouldDowngradeToV1,
  type OfflineBundleV2,
} from '@/lib/offline-bundle-v2';

export { parseBundle };

/** Metadata only — the payload itself never touches AsyncStorage. */
export interface OfflineBundleV2Meta {
  schema: 2;
  version: string;
  dataset: string;
  cutoverAt: string | null;
  nextTransitionAt: string | null;
  fetchedAt: string;
  bytes: number;
}

function metaKey(): string {
  return `transit_offline_v2_meta_${staticIslandConfig.islandKey}`;
}

function bundleDirectory(): Directory {
  return new Directory(Paths.document, `transit-bundle-${staticIslandConfig.islandKey}`);
}

function liveFile(): File {
  return new File(bundleDirectory(), 'bundle-v2.json');
}

function tempFile(): File {
  return new File(bundleDirectory(), 'bundle-v2.download.json');
}

function previousFile(): File {
  return new File(bundleDirectory(), 'bundle-v2.previous.json');
}

function ensureDirectory(): void {
  const dir = bundleDirectory();
  try {
    if (!dir.exists) {
      dir.create({ idempotent: true });
    }
  } catch (error) {
    logger.debug('transit bundle dir create failed', error);
  }
}

function safeDelete(file: File): void {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    logger.debug('transit bundle delete failed', error);
  }
}

export async function loadBundleMeta(): Promise<OfflineBundleV2Meta | null> {
  const raw = await AsyncStorage.getItem(metaKey());
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as OfflineBundleV2Meta;
  } catch {
    return null;
  }
}

async function saveBundleMeta(meta: OfflineBundleV2Meta): Promise<void> {
  await AsyncStorage.setItem(metaKey(), JSON.stringify(meta));
}

export async function loadCachedBundleV2(): Promise<OfflineBundleV2 | null> {
  const file = liveFile();
  try {
    if (!file.exists) {
      return null;
    }
    return parseBundle(file.textSync());
  } catch (error) {
    logger.warn('transit v2 bundle unreadable', error);
    return null;
  }
}

export interface BundleRefreshResult {
  bundle: OfflineBundleV2 | null;
  updated: boolean;
  /** True when the v2 endpoint is absent and the caller should use the v1 path. */
  downgraded: boolean;
  bytes: number;
}

/**
 * Download → verify → atomic replace → roll back.
 *
 * The previous file survives until the replacement has parsed, so a truncated or
 * malformed download can never leave the device with no timetables.
 */
export async function refreshBundleV2(): Promise<BundleRefreshResult> {
  ensureDirectory();

  let payload: OfflineBundleV2;
  try {
    payload = await fetchOfflineBundleV2();
  } catch (error) {
    // Only a genuinely absent endpoint downgrades. A 5xx or a network drop keeps
    // whatever is already on disk (98 B3).
    if (shouldDowngradeToV1(error)) {
      logger.warn('transit v2 bundle endpoint absent, falling back to v1');
      return { bundle: null, updated: false, downgraded: true, bytes: 0 };
    }
    logger.warn('transit v2 bundle refresh failed, keeping the cached copy', error);
    return { bundle: await loadCachedBundleV2(), updated: false, downgraded: false, bytes: 0 };
  }

  const serialized = JSON.stringify(payload);
  const temp = tempFile();
  const live = liveFile();
  const previous = previousFile();

  try {
    safeDelete(temp);
    temp.create({ overwrite: true });
    temp.write(serialized);

    // Verify what actually landed on disk, not what we meant to write.
    const verified = parseBundle(temp.textSync());
    if (!verified || verified.version !== payload.version) {
      safeDelete(temp);
      logger.warn('transit v2 bundle failed verification, keeping the cached copy');
      return { bundle: await loadCachedBundleV2(), updated: false, downgraded: false, bytes: 0 };
    }

    safeDelete(previous);
    if (live.exists) {
      live.moveSync(previous, { overwrite: true });
    }
    try {
      temp.moveSync(live, { overwrite: true });
    } catch (error) {
      // Roll back: the previous copy is still intact.
      if (previous.exists) {
        previous.moveSync(live, { overwrite: true });
      }
      throw error;
    }
    safeDelete(previous);

    const bytes = serialized.length;
    await saveBundleMeta({
      schema: 2,
      version: verified.version,
      dataset: verified.dataset,
      cutoverAt: verified.cutoverAt,
      nextTransitionAt: verified.nextTransitionAt,
      fetchedAt: new Date().toISOString(),
      bytes,
    });
    return { bundle: verified, updated: true, downgraded: false, bytes };
  } catch (error) {
    safeDelete(temp);
    logger.warn('transit v2 bundle write failed, keeping the cached copy', error);
    return { bundle: await loadCachedBundleV2(), updated: false, downgraded: false, bytes: 0 };
  }
}

/**
 * Probe the fingerprint before downloading. The server folds dataset counts, the
 * cutover instant and the effective service window into it, so both a phase
 * change and a school-term flip invalidate the cache (03 §5.4).
 */
export async function refreshBundleV2IfStale(
  options: { force?: boolean } = {},
): Promise<BundleRefreshResult> {
  const meta = await loadBundleMeta();

  if (!options.force && meta?.version) {
    try {
      const remote = await fetchOfflineBundleV2Version();
      if (remote.version && remote.version === meta.version) {
        return {
          bundle: await loadCachedBundleV2(),
          updated: false,
          downgraded: false,
          bytes: meta.bytes,
        };
      }
    } catch (error) {
      if (shouldDowngradeToV1(error)) {
        return { bundle: null, updated: false, downgraded: true, bytes: 0 };
      }
      logger.debug('transit v2 version probe failed', error);
    }
  }

  return refreshBundleV2();
}

/** Remove every trace of the cached bundle (used by the "delete my data" flow). */
export async function clearCachedBundleV2(): Promise<void> {
  safeDelete(liveFile());
  safeDelete(tempFile());
  safeDelete(previousFile());
  await AsyncStorage.removeItem(metaKey());
}
