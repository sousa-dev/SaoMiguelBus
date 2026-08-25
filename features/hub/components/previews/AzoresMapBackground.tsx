import { StyleSheet, View } from 'react-native';

import AzoresLocationMap from '@/assets/images/hub/azores-location-map.svg';

/** Azores archipelago locator — SVG component via metro svg-transformer. */
export function AzoresMapBackground() {
  return (
    <View style={styles.wrap}>
      <AzoresLocationMap width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
