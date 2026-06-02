import { MapPin } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { staticIslandConfig } from '@/config/island';
import {
  clampCoordinate,
  clampMapRegion,
  coordinateToRegion,
  isWithinIslandBounds,
  regionNeedsClamp,
} from '@/lib/island-map';
import type { AppTheme } from '@/lib/theme';

type Coords = { lat: number; lng: number };

type Props = {
  visible: boolean;
  theme: AppTheme;
  initialCoords?: Coords | null;
  userCoords?: Coords | null;
  onConfirm: (coords: Coords) => void;
  onClose: () => void;
};

const defaultPin = (): Coords => ({
  lat: staticIslandConfig.mapCenter.lat,
  lng: staticIslandConfig.mapCenter.lng,
});

/**
 * Full-screen map to tap or drag a report pin anywhere on São Miguel.
 */
export function LocationPickerModal({
  visible,
  theme,
  initialCoords,
  userCoords,
  onConfirm,
  onClose,
}: Props) {
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

  const setFromMap = (lat: number, lng: number) => {
    setPin(clampCoordinate(lat, lng));
  };

  const confirm = () => {
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
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ color: theme.muted, fontWeight: '600' }}>{t('trafficCancel')}</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('trafficPickLocationTitle')}</Text>
          <Pressable onPress={confirm} hitSlop={8}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('trafficPickLocationConfirm')}</Text>
          </Pressable>
        </View>

        <Text style={[styles.hint, { color: theme.muted }]}>{t('trafficPickLocationHint')}</Text>

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
          <Pressable
            onPress={() => userCoords && setPin(clampCoordinate(userCoords.lat, userCoords.lng))}
            style={[styles.gpsBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.primary, fontWeight: '600' }}>{t('trafficUseMyLocation')}</Text>
          </Pressable>
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
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  map: { flex: 1 },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  gpsBtn: {
    margin: 16,
    marginBottom: 28,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
});
