import { Image } from 'react-native';

/** In-memory cache of trail map image load outcomes (survives list/grid remounts). */

export type TrailImageCacheStatus = 'idle' | 'loading' | 'loaded' | 'error';

const loaded = new Set<string>();
const failed = new Set<string>();

export function trailImageCacheStatus(uri: string | undefined): TrailImageCacheStatus {
  const key = uri?.trim();
  if (!key) {
    return 'idle';
  }
  if (failed.has(key)) {
    return 'error';
  }
  if (loaded.has(key)) {
    return 'loaded';
  }
  return 'loading';
}

export function markTrailImageLoaded(uri: string) {
  const key = uri.trim();
  loaded.add(key);
  failed.delete(key);
}

export function markTrailImageError(uri: string) {
  failed.add(uri.trim());
}

export function prefetchTrailImages(urls: (string | undefined)[]) {
  for (const url of urls) {
    const key = url?.trim();
    if (!key || loaded.has(key) || failed.has(key)) {
      continue;
    }
    void Image.prefetch(key).then(
      (ok) => {
        if (ok) {
          markTrailImageLoaded(key);
        } else {
          markTrailImageError(key);
        }
      },
      () => markTrailImageError(key),
    );
  }
}
