import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Mountain } from 'lucide-react-native';

import {
  markTrailImageError,
  markTrailImageLoaded,
  trailImageCacheStatus,
  type TrailImageCacheStatus,
} from '@/features/trails/trailImageCache';
import type { AppTheme } from '@/lib/theme';

/**
 * Trail map thumbnail with in-memory + RN prefetch cache so list/grid toggles
 * do not re-show spinners for already-fetched images.
 */
export function TrailThumb({
  uri,
  theme,
  iconSize = 28,
  resizeMode = 'cover',
  style,
}: {
  uri?: string;
  theme: AppTheme;
  iconSize?: number;
  resizeMode?: ImageResizeMode;
  style?: StyleProp<ViewStyle>;
}) {
  const key = uri?.trim() ?? '';
  const [status, setStatus] = useState<TrailImageCacheStatus>(() => trailImageCacheStatus(uri));

  useEffect(() => {
    setStatus(trailImageCacheStatus(uri));
  }, [uri]);

  const showImage = Boolean(key) && status !== 'error';
  const showSpinner = status === 'loading';
  const showPlaceholder = status !== 'loaded';

  return (
    <View style={[styles.box, { backgroundColor: theme.surfaceVariant }, style]}>
      {showImage ? (
        <Image
          key={key}
          source={{ uri: key }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoadStart={() => {
            if (trailImageCacheStatus(key) !== 'loaded') {
              setStatus('loading');
            }
          }}
          onLoad={() => {
            markTrailImageLoaded(key);
            setStatus('loaded');
          }}
          onError={() => {
            markTrailImageError(key);
            setStatus('error');
          }}
        />
      ) : null}
      {showSpinner ? <ActivityIndicator color={theme.muted} /> : null}
      {showPlaceholder && !showSpinner ? (
        <Mountain size={iconSize} color={theme.muted} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
