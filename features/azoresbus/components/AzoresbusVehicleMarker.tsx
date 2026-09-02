import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AZORESBUS_VEHICLE_MARKER_SIZE } from '@/features/azoresbus/lib/vehicle-marker-overlay';
import { onColorFor } from '@/lib/color-utils';
import { elevation, radius } from '@/lib/tokens';
import type { AzoresbusVehicleSummary } from '@/lib/types';

const HALO_SIZE = AZORESBUS_VEHICLE_MARKER_SIZE + 14;
const PULSE_DURATION_MS = 1400;
/** How long the pill's snapshot keeps retaking after mount, to outlast the
 *  layout pass -- see the `tracksViewChanges` effect below. */
const SETTLE_MS = 500;

type Props = {
  /** Only `position` is read, so a live-trip vehicle (no route/status) fits too. */
  vehicle: Pick<AzoresbusVehicleSummary, 'position'>;
  pinColor: string;
  /** The line code, e.g. "110" — or a short fallback when it is not known yet. */
  label: string;
  onPress?: () => void;
  /**
   * A soft ring that expands and fades behind the pill, looping. Reserved for
   * a bus the rider is actually tracking — thirty pulsing markers on the fleet
   * map would be noise, not signal, so the fleet screen never sets this.
   */
  pulsing?: boolean;
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
export function AzoresbusVehicleMarker({ vehicle, pinColor, label, onPress, pulsing = false }: Props) {
  // Hooks run before the position guard below, unconditionally on every render.
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!pulsing) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [pulsing, progress]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - progress.value),
    transform: [{ scale: 0.6 + progress.value * 0.8 }],
  }));

  // react-native-maps bakes a custom Marker child into a static snapshot
  // image rather than a live view, and only retakes it while
  // `tracksViewChanges` is true. Left permanently false, a snapshot taken
  // before `adjustsFontSizeToFit` below finishes laying out the label can
  // stick as an undersized pill forever. Left permanently true, every one of
  // the fleet's 30-40 markers re-snapshots on every render, for no benefit
  // once a vehicle's pill is genuinely static.
  //
  // So: track for one short settle window after mount to guarantee a correct
  // snapshot, then stop -- except while pulsing, where the halo animates
  // continuously via Reanimated entirely outside React's render cycle, so
  // nothing else would ever tell the snapshot to update.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    if (pulsing) {
      setTracksViewChanges(true);
      return;
    }
    setTracksViewChanges(true);
    const timeout = setTimeout(() => setTracksViewChanges(false), SETTLE_MS);
    return () => clearTimeout(timeout);
  }, [pulsing]);

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
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={3}
    >
      <View style={styles.wrap}>
        {pulsing ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.halo, { backgroundColor: pinColor }, haloStyle]}
          />
        ) : null}
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
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  halo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: HALO_SIZE,
    height: HALO_SIZE,
    marginLeft: -HALO_SIZE / 2,
    marginTop: -HALO_SIZE / 2,
    borderRadius: HALO_SIZE / 2,
  },
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
