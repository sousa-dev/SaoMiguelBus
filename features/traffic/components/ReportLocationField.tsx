import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { LocationPickerModal } from '@/features/traffic/components/LocationPickerModal';
import { isWithinIslandBounds } from '@/lib/island-map';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Coords = { lat: number; lng: number };

type Props = {
  coords: Coords | null;
  gpsCoords?: Coords | null;
  userOnIsland?: boolean;
  onCoordsChange: (coords: Coords) => void;
};

export function ReportLocationField({ coords, gpsCoords, userOnIsland, onCoordsChange }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const outOfBounds = coords ? !isWithinIslandBounds(coords.lat, coords.lng) : false;
  const coordLabel = coords
    ? t('trafficLocationSelected', { lat: coords.lat.toFixed(4), lng: coords.lng.toFixed(4) })
    : '';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <MapPin size={iconSize.md} color={theme.primary} />
        <Text style={[typography.label, { color: theme.text }]}>{t('trafficLocationLabel')}</Text>
      </View>

      <Field
        value={coordLabel}
        editable={false}
        placeholder={t('trafficPickLocationHint')}
        error={
          outOfBounds
            ? t('trafficLocationOutOfBounds')
            : !coords
              ? t('trafficLocationNeeded')
              : undefined
        }
      />

      <View style={styles.actions}>
        {userOnIsland && gpsCoords ? (
          <Button
            label={t('trafficUseMyLocation')}
            variant="outline"
            onPress={() => onCoordsChange(gpsCoords)}
            style={styles.actionBtn}
          />
        ) : null}
        <Button
          label={t('trafficPickOnMap')}
          onPress={() => setPickerOpen(true)}
          style={styles.actionBtn}
        />
      </View>

      <LocationPickerModal
        visible={pickerOpen}
        initialCoords={coords}
        userCoords={gpsCoords}
        onConfirm={onCoordsChange}
        onClose={() => setPickerOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  actionBtn: { flex: 1 },
});
