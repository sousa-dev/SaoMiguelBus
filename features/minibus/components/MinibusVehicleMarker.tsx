import { Bus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { MINIBUS_VEHICLE_MARKER_SIZE } from '@/features/minibus/lib/vehicle-marker-overlay';
import { onColorFor } from '@/lib/color-utils';
import { elevation } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { MinibusVehicleSummary } from '@/lib/types';

type Props = {
  vehicle: MinibusVehicleSummary;
  pinColor: string;
  label: string;
  onPress?: () => void;
};

export function MinibusVehicleMarker({ vehicle, pinColor, label, onPress }: Props) {
  const theme = useAppTheme();
  const lat = vehicle.position?.lat;
  const lon = vehicle.position?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  const onFill = onColorFor(pinColor);
  const size = MINIBUS_VEHICLE_MARKER_SIZE;

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
            styles.bubble,
            elevation(2, '#000'),
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: pinColor,
              borderColor: '#fff',
              borderWidth: 2,
            },
          ]}
        >
          <Bus size={14} color={onFill} strokeWidth={2.5} />
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
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
