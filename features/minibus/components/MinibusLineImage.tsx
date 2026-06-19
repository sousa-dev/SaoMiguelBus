import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  /** Local (offline-cached) file uri, preferred when present. */
  localUri?: string | null;
  /** Remote API url, used when no local copy is cached. */
  remoteUrl?: string | null;
  accessibilityLabel: string;
};

/** Inline timetable image (replaces the old PDF viewer), offline-cache first. */
export function MinibusLineImage({ localUri, remoteUrl, accessibilityLabel }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const uri = localUri ?? remoteUrl ?? null;
  const [aspectRatio, setAspectRatio] = useState(0.7);

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
    <Image
      accessibilityLabel={accessibilityLabel}
      source={{ uri }}
      style={[styles.image, { aspectRatio }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', borderRadius: radius.md },
  placeholder: {
    width: '100%',
    minHeight: 160,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
});
