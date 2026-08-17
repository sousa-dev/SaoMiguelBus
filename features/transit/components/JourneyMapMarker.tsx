import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { JourneyMapPin } from '@/features/transit/lib/journey-map-data';
import { onColorFor } from '@/lib/color-utils';
import { elevation } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/** Action pins carry a number; the stops a bus merely passes stay small dots. */
const ACTION_SIZE = 26;
const STOP_SIZE = 12;

type Props = {
  pin: JourneyMapPin;
  highlighted?: boolean;
  onPress?: () => void;
};

/**
 * The iOS half of a journey pin. Android draws its own from
 * `journeyPinOverlay` — `OsmMapView` only extracts plain `<Marker>` children
 * into the Android spec, and a custom view like this one is dropped.
 */
export function JourneyMapMarker({ pin, highlighted = false, onPress }: Props) {
  const theme = useAppTheme();
  const isAction = pin.kind !== 'stop';
  const size = (isAction ? ACTION_SIZE : STOP_SIZE) + (highlighted ? 6 : 0);
  const onFill = onColorFor(pin.color);

  return (
    <Marker
      coordinate={pin.coordinate}
      title={pin.name}
      description={pin.code ? `${pin.time} · ${pin.code}` : pin.time}
      onPress={onPress}
      tracksViewChanges={highlighted}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={highlighted ? 3 : isAction ? 2 : 1}
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
              backgroundColor: pin.color,
              borderColor: highlighted ? theme.text : '#fff',
              borderWidth: highlighted ? 2.5 : 2,
            },
          ]}
        >
          {isAction ? (
            <Text style={[styles.label, { color: onFill }]}>{pin.step}</Text>
          ) : null}
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  bubble: { alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '800', fontSize: 12, lineHeight: 14 },
});
