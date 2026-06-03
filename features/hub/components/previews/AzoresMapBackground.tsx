import { Asset } from 'expo-asset';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { azoresLocationMapAsset } from '@/features/hub/map-assets';

/** Raster-free Azores locator SVG loaded as a bundled asset (no svg-transformer). */
export function AzoresMapBackground() {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const asset = Asset.fromModule(azoresLocationMapAsset);
      await asset.downloadAsync();
      if (!cancelled) {
        setUri(asset.localUri ?? asset.uri);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!uri) {
    return <View style={styles.placeholder} />;
  }

  return <SvgUri uri={uri} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />;
}

const styles = StyleSheet.create({
  placeholder: { flex: 1 },
});
