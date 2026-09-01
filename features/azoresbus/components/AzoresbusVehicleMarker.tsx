import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { AZORESBUS_VEHICLE_MARKER_SIZE } from '@/features/azoresbus/lib/vehicle-marker-overlay';
import { onColorFor } from '@/lib/color-utils';
import { elevation, radius } from '@/lib/tokens';
import type { AzoresbusVehicleSummary } from '@/lib/types';

type Props = {
  vehicle: AzoresbusVehicleSummary;
  pinColor: string;
  /** The line code, e.g. "110" — or a short fallback when it is not known yet. */
  label: string;
  onPress?: () => void;
};

/**
 * A pill carrying the line code, not a coloured dot.
 *
 * Minibus can use a coloured circle with a bus glyph because its four lines have
 * four distinct colours. AzoresBus has 26 lines live across three vendor
 * colours, so a dot tells the rider nothing — thirty identical blue circles on
 * one island. The code is the only thing that identifies the bus at a glance,
 * so it goes on the marker itself.
 */
export function AzoresbusVehicleMarker({ vehicle, pinColor, label, onPress }: Props) {
  const lat = vehicle.position?.lat;
  const lon = vehicle.position?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  const onFill = onColorFor(pinColor);

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      title={label}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={3}
    >
      <View style={styles.wrap}>
        <View
          style={[
            styles.pill,
            elevation(2, '#000'),
            { backgroundColor: pinColor, borderColor: '#fff' },
          ]}
        >
          <Text
            style={[styles.label, { color: onFill }]}
            numberOfLines={1}
            // Long codes shrink rather than truncating: "1001" must stay readable.
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {label}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  pill: {
    minWidth: AZORESBUS_VEHICLE_MARKER_SIZE,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
});
