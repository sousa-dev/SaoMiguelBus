import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { staticIslandConfig } from '@/config/island';
import { fetchMinibusBundleVersion, fetchMinibusOfflineBundle } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { MinibusOfflineBundle } from '@/lib/types';

/** Minimum spacing between version probes / refresh attempts. */
export const MINIBUS_MIN_SYNC_INTERVAL = 1000 * 60 * 60; // 1h

export interface MinibusOfflineSnapshot {
  version: string;
  /** API locale the localized strings were fetched with — a change forces a refresh. */
  locale: string;
  bundle: MinibusOfflineBundle;
  /** line_slug -> local file uri for the cached timetable image. */
  imageUris: Record<string, string>;
  fetchedAt: string;
}

function snapshotKey(): string {
  return `minibus_offline_snapshot_${staticIslandConfig.islandKey}`;
}

function imageDirectory(): Directory {
  return new Directory(Paths.document, `minibus-images-${staticIslandConfig.islandKey}`);
}

export async function loadCachedSnapshot(): Promise<MinibusOfflineSnapshot | null> {
  const raw = await AsyncStorage.getItem(snapshotKey());
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as MinibusOfflineSnapshot;
  } catch {
    return null;
  }
}

async function saveSnapshot(snapshot: MinibusOfflineSnapshot): Promise<void> {
  await AsyncStorage.setItem(snapshotKey(), JSON.stringify(snapshot));
}

async function downloadBundleImages(bundle: MinibusOfflineBundle): Promise<Record<string, string>> {
  const dir = imageDirectory();
  try {
    if (!dir.exists) {
      dir.create({ idempotent: true });
    }
  } catch (error) {
    logger.debug('minibus image dir create failed', error);
  }

  const uris: Record<string, string> = {};

  const queue: { key: string; url: string }[] = [];
  for (const image of bundle.images) {
    if (image.url && image.line_slug) {
      queue.push({ key: image.line_slug, url: image.url });
    }
  }
  if (bundle.network_map?.slug && bundle.network_map.url) {
    queue.push({ key: bundle.network_map.slug, url: bundle.network_map.url });
  }

  for (const item of queue) {
    const target = new File(dir, `${item.key}.png`);
    try {
      if (target.exists) {
        target.delete();
      }
      const downloaded = await File.downloadFileAsync(item.url, target, { idempotent: true });
      uris[item.key] = downloaded.uri;
    } catch (error) {
      logger.warn('minibus image download failed', item.key, error);
    }
  }
  return uris;
}

export async function refreshMinibusSnapshot(locale: string): Promise<MinibusOfflineSnapshot | null> {
  try {
    const bundle = await fetchMinibusOfflineBundle({ locale });
    const imageUris = await downloadBundleImages(bundle);
    const snapshot: MinibusOfflineSnapshot = {
      version: bundle.version,
      locale,
      bundle,
      imageUris,
      fetchedAt: new Date().toISOString(),
    };
    await saveSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    logger.warn('minibus offline bundle refresh failed', error);
    return null;
  }
}

/**
 * Version-aware refresh: probe the cheap version endpoint first and skip the
 * (image-heavy) download when the cache already matches and images are present.
 * On a failed probe (offline / older backend) the cached snapshot is kept.
 */
export async function refreshMinibusSnapshotIfStale(locale: string): Promise<{
  snapshot: MinibusOfflineSnapshot | null;
  updated: boolean;
}> {
  const cached = await loadCachedSnapshot();

  if (cached && cached.locale === locale) {
    try {
      const remote = await fetchMinibusBundleVersion();
      const imagesPresent = cached.bundle.images.every(
        (image) => !image.line_slug || Boolean(cached.imageUris[image.line_slug]),
      );
      const networkMapPresent =
        !cached.bundle.network_map?.slug || Boolean(cached.imageUris[cached.bundle.network_map.slug]);
      if (remote.version && cached.version === remote.version && imagesPresent && networkMapPresent) {
        return { snapshot: cached, updated: false };
      }
    } catch (error) {
      logger.debug('minibus version probe failed', error);
      return { snapshot: cached, updated: false };
    }
  }

  const snapshot = await refreshMinibusSnapshot(locale);
  return { snapshot: snapshot ?? cached, updated: Boolean(snapshot) };
}

export async function hasMinibusOfflineCache(): Promise<boolean> {
  const snapshot = await loadCachedSnapshot();
  return Boolean(snapshot?.bundle?.lines?.length);
}

export function localLineImageUri(snapshot: MinibusOfflineSnapshot | null, lineSlug: string): string | null {
  return snapshot?.imageUris?.[lineSlug] ?? null;
}

export function localDocumentImageUri(snapshot: MinibusOfflineSnapshot | null, slug: string): string | null {
  return snapshot?.imageUris?.[slug] ?? null;
}
