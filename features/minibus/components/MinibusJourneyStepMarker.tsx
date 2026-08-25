import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { JourneyMapMarker } from '@/features/minibus/journeySteps';
import { MINIBUS_STOP_MARKER_SIZE } from '@/features/minibus/lib/minibus-stop-marker-overlay';
import { onColorFor } from '@/lib/color-utils';
import { elevation } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  marker: JourneyMapMarker;
  highlighted?: boolean;
};

export function MinibusJourneyStepMarker({ marker, highlighted = false }: Props) {
  const theme = useAppTheme();
  const onFill = onColorFor(marker.color);
  const size = highlighted ? MINIBUS_STOP_MARKER_SIZE + 6 : MINIBUS_STOP_MARKER_SIZE + 2;

  return (
    <Marker
      coordinate={marker.coordinate}
      title={marker.title}
      description={`${marker.stepNumber}`}
      tracksViewChanges={highlighted}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={highlighted ? 3 : marker.kind === 'transfer' ? 2 : 1}
    >
      <View style={styles.wrap}>
        {highlighted ? (
          <View style={[styles.halo, { borderColor: theme.text, shadowColor: theme.text }]} />
        ) : null}
        <View
          style={[
            styles.bubble,
            elevation(highlighted ? 3 : 2, '#000'),
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: marker.color,
              borderColor: highlighted ? theme.text : '#fff',
              borderWidth: highlighted ? 2.5 : 2,
            },
          ]}
        >
          <Text style={[styles.label, { color: onFill, fontSize: highlighted ? 12 : 11 }]}>
            {marker.stepNumber}
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    lineHeight: 13,
  },
});
