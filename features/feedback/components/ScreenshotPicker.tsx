import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type ScreenshotPickerProps = {
  uris: string[];
  onChange: (uris: string[]) => void;
  max?: number;
};

const THUMB = 84;

export function ScreenshotPicker({ uris, onChange, max = 4 }: ScreenshotPickerProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const pick = async () => {
    if (uris.length >= max) {
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: max - uris.length,
      quality: 0.7,
    });
    if (result.canceled) {
      return;
    }
    const next = [...uris, ...result.assets.map((a) => a.uri)].slice(0, max);
    onChange(next);
  };

  const remove = (uri: string) => onChange(uris.filter((u) => u !== uri));

  return (
    <View>
      <Text style={[typography.label, { color: theme.text, marginBottom: space.sm }]}>
        {t('feedbackScreenshotsLabel')}
      </Text>
      <View style={styles.grid}>
        {uris.map((uri) => (
          <View key={uri} style={styles.thumbWrap}>
            <Image source={{ uri }} style={[styles.thumb, { borderColor: theme.border }]} />
            <Pressable
              onPress={() => remove(uri)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('feedbackRemoveScreenshot')}
              style={[styles.remove, { backgroundColor: theme.scrim }]}
            >
              <X size={14} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}

        {uris.length < max ? (
          <Pressable
            onPress={() => void pick()}
            accessibilityRole="button"
            accessibilityLabel={t('feedbackAddScreenshot')}
            style={[styles.addTile, { borderColor: theme.border, backgroundColor: theme.card }]}
          >
            <ImagePlus size={iconSize.lg} color={theme.primary} strokeWidth={2} />
            <Text style={[typography.caption, { color: theme.muted, marginTop: 4 }]}>
              {t('feedbackAddScreenshot')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
