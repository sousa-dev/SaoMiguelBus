import React, { useState } from 'react';
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

import type { AppTheme } from '@/lib/theme';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Trail image with graceful loading/error states: shows a spinner while the
 * remote map image loads and a mountain icon when it's missing or fails.
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
  const hasUri = Boolean(uri?.trim());
  const [status, setStatus] = useState<Status>(hasUri ? 'loading' : 'idle');
  const showImage = hasUri && status !== 'error';

  return (
    <View style={[styles.box, { backgroundColor: theme.surfaceVariant }, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoadStart={() => setStatus('loading')}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      ) : null}
      {status === 'loading' ? (
        <ActivityIndicator color={theme.muted} />
      ) : status !== 'loaded' ? (
        <Mountain size={iconSize} color={theme.muted} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
