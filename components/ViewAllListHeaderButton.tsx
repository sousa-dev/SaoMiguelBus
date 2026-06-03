import { useRouter, type Href } from 'expo-router';
import { LayoutList } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { withAlpha } from '@/lib/color-utils';
import { hitSlop, iconSize, radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  href: Href;
  labelKey?: string;
};

const HEADER_ACTION_HEIGHT = Platform.select({ ios: 44, android: 48, default: 44 }) as number;

export function ViewAllListHeaderButton({ href, labelKey = 'homeSuggestionBrowse' }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const label = t(labelKey);

  return (
    <View style={styles.outer}>
      <Pressable
        onPress={() => router.push(href)}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={hitSlop.minTouch}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: withAlpha(theme.primary, 0.14),
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.iconSlot}>
          <LayoutList size={iconSize.sm} color={theme.primary} strokeWidth={2} />
        </View>
        <Text
          style={[styles.label, { color: theme.primary }]}
          numberOfLines={1}
          {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    height: HEADER_ACTION_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    maxWidth: 172,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.full,
  },
  iconSlot: {
    width: iconSize.sm,
    height: iconSize.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
});
