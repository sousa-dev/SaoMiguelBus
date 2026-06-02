import { MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { staticIslandConfig } from '@/config/island';
import {
  clampCoordinate,
  clampMapRegion,
  coordinateToRegion,
  isWithinIslandBounds,
  regionNeedsClamp,
} from '@/lib/island-map';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Coords = { lat: number; lng: number };

type Props = {
  visible: boolean;
  initialCoords?: Coords | null;
  userCoords?: Coords | null;
  onConfirm: (coords: Coords) => void;
  onClose: () => void;
};

const defaultPin = (): Coords => ({
  lat: staticIslandConfig.mapCenter.lat,
  lng: staticIslandConfig.mapCenter.lng,
});

export function LocationPickerModal({
  visible,
  initialCoords,
  userCoords,
  onConfirm,
  onClose,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const [pin, setPin] = useState<Coords>(initialCoords ?? defaultPin());

  useEffect(() => {
    if (visible) {
      setPin(initialCoords ?? defaultPin());
    }
  }, [visible, initialCoords?.lat, initialCoords?.lng]);

  const userOnIsland = useMemo(
    () => (userCoords ? isWithinIslandBounds(userCoords.lat, userCoords.lng) : false),
    [userCoords],
  );

  const outOfBounds = !isWithinIslandBounds(pin.lat, pin.lng);

  const setFromMap = (lat: number, lng: number) => {
    setPin(clampCoordinate(lat, lng));
  };

  const confirm = () => {
    if (outOfBounds) {
      return;
    }
    onConfirm(pin);
    onClose();
  };

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Button label={t('trafficCancel')} variant="ghost" onPress={onClose} />
          <Text style={[typography.headline, { color: theme.text }]}>{t('trafficPickLocationTitle')}</Text>
          <Button label={t('trafficPickLocationConfirm')} onPress={confirm} disabled={outOfBounds} />
        </View>

        <Text style={[typography.caption, { color: theme.muted, textAlign: 'center', padding: space.md }]}>
          {t('trafficPickLocationHint')}
        </Text>
        {outOfBounds ? (
          <Text style={[typography.caption, { color: theme.danger, textAlign: 'center', marginBottom: space.sm }]}>
            {t('trafficLocationNeeded')}
          </Text>
        ) : null}

        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={coordinateToRegion(pin)}
          showsUserLocation={userOnIsland}
          onPress={(e) => setFromMap(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
          onRegionChangeComplete={(region) => {
            if (!regionNeedsClamp(region)) {
              return;
            }
            mapRef.current?.animateToRegion(clampMapRegion(region), 180);
          }}
        >
          {Platform.OS === 'android' ? (
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
          ) : null}
          <Marker
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            draggable
            tracksViewChanges={false}
            onDragEnd={(e) =>
              setFromMap(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
            }
          >
            <View style={[styles.pin, { backgroundColor: theme.primary, borderColor: theme.onPrimary }]}>
              <MapPin size={18} color={theme.onPrimary} strokeWidth={2.5} />
            </View>
          </Marker>
        </MapView>

        {userOnIsland ? (
          <Button
            label={t('trafficUseMyLocation')}
            variant="outline"
            onPress={() => userCoords && setPin(clampCoordinate(userCoords.lat, userCoords.lng))}
            fullWidth
            style={styles.gpsBtn}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: 56,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  map: { flex: 1 },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  gpsBtn: { margin: space.lg, marginBottom: space['2xl'] },
});
