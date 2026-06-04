import { usePathname } from 'expo-router';
import { WifiOff } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useNetwork } from '@/lib/network-provider';
import { resolveOfflineBannerVariant } from '@/lib/offline-banner-display';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const HEADER_HEIGHT = Platform.select({ ios: 44, android: 48, default: 44 }) as number;
/** Keep the pill out of header left/right action slots (menu, settings, etc.). */
const HEADER_SIDE_GUTTER = Platform.select({ ios: 52, android: 56, default: 52 }) as number;

/**
 * App-wide offline indicator, centered in the stack header row (below the status bar).
 * Non-interactive; variant adapts to the current route.
 */
export function GlobalOfflineBanner() {
  const pathname = usePathname();
  const { isOnline, hasOfflineBundle, offlineBundleStale } = useNetwork();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useAppTheme();

  if (isOnline) {
    return null;
  }

  const variant = resolveOfflineBannerVariant(pathname);
  const message = !hasOfflineBundle
    ? t('offlineGlobalOffline')
    : offlineBundleStale
      ? t('offlineGlobalStale')
      : t('offlineGlobalCached');

  return (
    <View
      style={[
        styles.wrap,
        {
          top: insets.top,
          height: HEADER_HEIGHT,
          paddingLeft: Math.max(insets.left, HEADER_SIDE_GUTTER),
          paddingRight: Math.max(insets.right, HEADER_SIDE_GUTTER),
        },
      ]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <View
        style={[styles.pill, variant === 'icon' && styles.pillIconOnly, { backgroundColor: theme.secondary }]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={message}
      >
        <WifiOff
          size={variant === 'icon' ? 18 : 14}
          color={theme.onSecondary}
          strokeWidth={2}
        />
        {variant === 'pill' ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[typography.caption, styles.message, { color: theme.onSecondary }]}
          >
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    maxWidth: '100%',
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.full,
  },
  pillIconOnly: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  message: {
    flexShrink: 1,
    fontWeight: '600',
  },
});
