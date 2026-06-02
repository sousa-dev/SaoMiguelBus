import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LocationPickerModal } from '@/features/traffic/components/LocationPickerModal';
import type { AppTheme } from '@/lib/theme';

type Coords = { lat: number; lng: number };

type Props = {
  theme: AppTheme;
  coords: Coords | null;
  gpsCoords?: Coords | null;
  userOnIsland?: boolean;
  onCoordsChange: (coords: Coords) => void;
};

export function ReportLocationField({
  theme,
  coords,
  gpsCoords,
  userOnIsland,
  onCoordsChange,
}: Props) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const useGps = () => {
    if (gpsCoords) {
      onCoordsChange(gpsCoords);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{t('trafficLocationLabel')}</Text>
      {coords ? (
        <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 10 }}>
          {t('trafficLocationSelected', {
            lat: coords.lat.toFixed(4),
            lng: coords.lng.toFixed(4),
          })}
        </Text>
      ) : (
        <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 10 }}>
          {t('trafficPickLocationHint')}
        </Text>
      )}

      <View style={styles.row}>
        {userOnIsland && gpsCoords ? (
          <Pressable
            onPress={useGps}
            style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.card }]}
          >
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>
              {t('trafficUseMyLocation')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.btn, { borderColor: theme.primary, backgroundColor: theme.card, flex: 1 }]}
        >
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
            {t('trafficPickOnMap')}
          </Text>
        </Pressable>
      </View>

      <LocationPickerModal
        visible={pickerOpen}
        theme={theme}
        initialCoords={coords}
        userCoords={gpsCoords}
        onConfirm={onCoordsChange}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
});
