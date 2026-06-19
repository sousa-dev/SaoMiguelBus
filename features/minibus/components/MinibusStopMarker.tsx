import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { MINIBUS_STOP_MARKER_SIZE } from '@/features/minibus/lib/minibus-stop-marker-overlay';
import { onColorFor } from '@/lib/color-utils';
import { elevation } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { MinibusNetworkStop } from '@/lib/types';

type Props = {
  stop: MinibusNetworkStop;
  lineColor: string;
  highlighted?: boolean;
};

export function MinibusStopMarker({ stop, lineColor, highlighted = false }: Props) {
  const theme = useAppTheme();
  const lat = stop.latitude;
  const lng = stop.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const onFill = onColorFor(lineColor);
  const size = highlighted ? MINIBUS_STOP_MARKER_SIZE + 4 : MINIBUS_STOP_MARKER_SIZE;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      title={stop.name_pt}
      description={`${stop.sequence}`}
      tracksViewChanges={highlighted}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={highlighted ? 2 : 1}
    >
      <View style={styles.wrap}>
        {highlighted ? (
          <View style={[styles.halo, { borderColor: theme.text, shadowColor: theme.text }]} />
        ) : null}
        <View
          style={[
            styles.bubble,
            elevation(highlighted ? 3 : 1, '#000'),
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: lineColor,
              borderColor: highlighted ? theme.text : '#fff',
              borderWidth: highlighted ? 2.5 : 1.5,
            },
          ]}
        >
          <Text style={[styles.label, { color: onFill, fontSize: highlighted ? 11 : 10 }]}>
            {stop.sequence}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    lineHeight: 12,
  },
});
