import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageLoadEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { MinibusZoomableImageModal } from '@/features/minibus/components/MinibusZoomableImageModal';
import { resolveMinibusImageUri } from '@/features/minibus/pdfUrl';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type LoadState = 'pending' | 'ready' | 'failed';

type Props = {
  /** Local (offline-cached) file uri, preferred when present. */
  localUri?: string | null;
  /** Remote API url, used when no local copy is cached. */
  remoteUrl?: string | null;
  /** Rebuild remote stream URL from slug + EXPO_PUBLIC_API_URL (HTTPS). */
  documentSlug?: string;
  accessibilityLabel: string;
  /** Smaller preview for list/index screens. */
  compact?: boolean;
  tapHintKey?: string;
  fullscreenA11yKey?: string;
  fullscreenA11yValues?: Record<string, string>;
  /** Rendered only when the image loads successfully. */
  sectionTitle?: string;
  sectionTitleStyle?: StyleProp<TextStyle>;
  onAvailabilityChange?: (available: boolean) => void;
};

/** Inline image with offline-cache first. Tap to open fullscreen zoom. Hidden when unavailable. */
export function MinibusLineImage({
  localUri,
  remoteUrl,
  documentSlug,
  accessibilityLabel,
  compact = false,
  tapHintKey = 'minibusTimetableTapToZoom',
  fullscreenA11yKey = 'minibusTimetableOpenFullscreen',
  fullscreenA11yValues,
  sectionTitle,
  sectionTitleStyle,
  onAvailabilityChange,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const uri = useMemo(
    () => resolveMinibusImageUri(localUri, remoteUrl, documentSlug),
    [documentSlug, localUri, remoteUrl],
  );
  const [aspectRatio, setAspectRatio] = useState(0.7);
  const [fullscreen, setFullscreen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>(() => (uri ? 'pending' : 'failed'));

  useEffect(() => {
    if (!uri) {
      setLoadState('failed');
      return;
    }
    setLoadState('pending');
  }, [uri]);

  const handleImageLoad = (event: ImageLoadEvent) => {
    const { width, height } = event.nativeEvent.source;
    if (width && height) {
      setAspectRatio(width / height);
    }
    setLoadState('ready');
  };

  useEffect(() => {
    onAvailabilityChange?.(loadState === 'ready');
  }, [loadState, onAvailabilityChange]);

  if (loadState === 'failed' || !uri) {
    return null;
  }

  const body: ReactNode =
    loadState === 'ready' ? (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(fullscreenA11yKey, {
            line: accessibilityLabel,
            ...fullscreenA11yValues,
          })}
          onPress={() => setFullscreen(true)}
          style={compact ? styles.compactPressable : undefined}
        >
          <Image
            accessibilityLabel={accessibilityLabel}
            source={{ uri }}
            style={[styles.image, compact && styles.imageCompact, { aspectRatio }]}
            resizeMode="contain"
            onLoad={handleImageLoad}
          />
          <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs, textAlign: 'center' }]}>
            {t(tapHintKey)}
          </Text>
        </Pressable>

        {fullscreen ? (
          <MinibusZoomableImageModal
            visible={fullscreen}
            uri={uri}
            aspectRatio={aspectRatio}
            accessibilityLabel={accessibilityLabel}
            onClose={() => setFullscreen(false)}
          />
        ) : null}
      </>
    ) : (
      <View style={styles.probe} pointerEvents="none">
        <Image
          source={{ uri }}
          style={styles.probeImage}
          resizeMode="contain"
          onLoad={handleImageLoad}
          onError={() => setLoadState('failed')}
        />
      </View>
    );

  return (
    <View style={sectionTitle ? styles.section : undefined}>
      {loadState === 'ready' && sectionTitle ? (
        <Text style={[typography.label, { color: theme.muted, marginBottom: space.sm }, sectionTitleStyle]}>
          {sectionTitle}
        </Text>
      ) : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.lg },
  image: { width: '100%', borderRadius: radius.md },
  imageCompact: { maxHeight: 200, width: '100%', alignSelf: 'center' },
  compactPressable: { alignItems: 'center' },
  probe: {
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  probeImage: {
    width: 1,
    height: 1,
  },
});
