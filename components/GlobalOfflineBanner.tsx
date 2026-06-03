import { WifiOff } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { useNetwork } from '@/lib/network-provider';

/**
 * App-wide offline indicator. Pinned below the status bar, non-interactive, and
 * driven by the debounced connectivity state in NetworkProvider so it does not
 * flicker on brief drops. Messaging adapts to cached/stale offline data.
 */
export function GlobalOfflineBanner() {
  const { isOnline, hasOfflineBundle, offlineBundleStale } = useNetwork();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (isOnline) {
    return null;
  }

  const message = !hasOfflineBundle
    ? t('offlineGlobalOffline')
    : offlineBundleStale
      ? t('offlineGlobalStale')
      : t('offlineGlobalCached');

  return (
    <View style={[styles.wrap, { top: insets.top }]} pointerEvents="none">
      <Banner variant="offline" icon={WifiOff} message={message} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
