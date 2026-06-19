import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MinibusZoomableImageModal } from '@/features/minibus/components/MinibusZoomableImageModal';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  /** Local (offline-cached) file uri, preferred when present. */
  localUri?: string | null;
  /** Remote API url, used when no local copy is cached. */
  remoteUrl?: string | null;
  accessibilityLabel: string;
  /** Smaller preview for list/index screens. */
  compact?: boolean;
  tapHintKey?: string;
  fullscreenA11yKey?: string;
  fullscreenA11yValues?: Record<string, string>;
};

/** Inline image with offline-cache first. Tap to open fullscreen zoom. */
export function MinibusLineImage({
  localUri,
  remoteUrl,
  accessibilityLabel,
  compact = false,
  tapHintKey = 'minibusTimetableTapToZoom',
  fullscreenA11yKey = 'minibusTimetableOpenFullscreen',
  fullscreenA11yValues,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const uri = localUri ?? remoteUrl ?? null;
  const [aspectRatio, setAspectRatio] = useState(0.7);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!uri) {
      return;
    }
    let active = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (active && height > 0) {
          setAspectRatio(width / height);
        }
      },
      () => {
        /* keep the default ratio on failure */
      },
    );
    return () => {
      active = false;
    };
  }, [uri]);

  if (!uri) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.surfaceVariant }]}>
        <Text style={[typography.body, { color: theme.muted }]}>{t('minibusTimetableUnavailable')}</Text>
      </View>
    );
  }

  return (
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
        />
        <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs, textAlign: 'center' }]}>
          {t(tapHintKey)}
        </Text>
      </Pressable>

      <MinibusZoomableImageModal
        visible={fullscreen}
        uri={uri}
        accessibilityLabel={accessibilityLabel}
        onClose={() => setFullscreen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', borderRadius: radius.md },
  imageCompact: { maxHeight: 200, width: '100%', alignSelf: 'center' },
  compactPressable: { alignItems: 'center' },
  placeholder: {
    width: '100%',
    minHeight: 160,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
});
