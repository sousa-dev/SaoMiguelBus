import { MapPin, Search } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { OsmMapView } from '@/components/OsmMapView';
import { searchPlaces, type PlaceResult } from '@/lib/api';
import { staticIslandConfig } from '@/config/island';
import {
  clampCoordinate,
  clampMapRegion,
  coordinateToRegion,
  isWithinIslandBounds,
  regionNeedsClamp,
  saoMiguelMapBounds,
  trafficMapViewportPad,
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
  const mapRef = useRef<ElementRef<typeof OsmMapView>>(null);
  const [pin, setPin] = useState<Coords>(initialCoords ?? defaultPin());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin(initialCoords ?? defaultPin());
      setQuery('');
      setResults([]);
      setSearchError(false);
    }
  }, [visible, initialCoords?.lat, initialCoords?.lng]);

  // Debounced address search bounded to the island.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(false);
    const handle = setTimeout(async () => {
      try {
        const found = await searchPlaces(q);
        if (!cancelled) {
          setResults(found);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError(true);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const selectResult = (place: PlaceResult) => {
    const next = clampCoordinate(place.lat, place.lng);
    setPin(next);
    setResults([]);
    setQuery('');
    mapRef.current?.animateToRegion(coordinateToRegion(next), 250);
  };

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

        <Text style={[typography.caption, { color: theme.muted, textAlign: 'center', paddingHorizontal: space.md, paddingTop: space.md }]}>
          {t('trafficPickLocationHint')}
        </Text>

        <View style={styles.searchWrap}>
          <Field
            value={query}
            onChangeText={setQuery}
            placeholder={t('trafficSearchPlaceholder')}
            autoCorrect={false}
            returnKeyType="search"
            style={{ marginBottom: 0 }}
            trailing={
              searching ? (
                <ActivityIndicator size="small" color={theme.muted} />
              ) : (
                <Search size={18} color={theme.muted} />
              )
            }
          />
          {results.length > 0 ? (
            <ScrollView
              style={[styles.results, { backgroundColor: theme.card, borderColor: theme.border }]}
              keyboardShouldPersistTaps="handled"
            >
              {results.map((place, idx) => (
                <Pressable
                  key={`${place.lat},${place.lng},${idx}`}
                  onPress={() => selectResult(place)}
                  style={[styles.resultRow, { borderBottomColor: theme.border }]}
                >
                  <MapPin size={16} color={theme.primary} />
                  <Text style={[typography.caption, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                    {place.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {searchError ? (
            <Text style={[typography.caption, { color: theme.danger, marginTop: space.xs }]}>
              {t('trafficSearchError')}
            </Text>
          ) : !searching && query.trim().length >= 3 && results.length === 0 ? (
            <Text style={[typography.caption, { color: theme.muted, marginTop: space.xs }]}>
              {t('trafficSearchNoResults')}
            </Text>
          ) : null}
        </View>

        {outOfBounds ? (
          <Text style={[typography.caption, { color: theme.danger, textAlign: 'center', marginBottom: space.sm }]}>
            {t('trafficLocationNeeded')}
          </Text>
        ) : null}

        <OsmMapView
          ref={mapRef}
          style={styles.map}
          initialRegion={coordinateToRegion(pin)}
          showsUserLocation={userOnIsland}
          centerCoordinate={userOnIsland ? userCoords : null}
          onPress={(e) => setFromMap(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
          onRegionChangeComplete={(region) => {
            if (!regionNeedsClamp(region, saoMiguelMapBounds, trafficMapViewportPad)) {
              return;
            }
            mapRef.current?.animateToRegion(
              clampMapRegion(region, saoMiguelMapBounds, trafficMapViewportPad),
              180,
            );
          }}
        >
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
        </OsmMapView>

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
  searchWrap: { paddingHorizontal: space.md, paddingTop: space.sm },
  results: {
    maxHeight: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginTop: space.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
