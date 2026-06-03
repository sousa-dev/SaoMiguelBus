import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AzoresMiniMap } from '@/features/hub/components/previews/AzoresMiniMap';
import { typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { SeismicEvent } from '@/lib/types';

type HubSeismicPreviewProps = {
  events: SeismicEvent[];
};

export function HubSeismicPreview({ events }: HubSeismicPreviewProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const points = events.map((e) => ({ latitude: e.latitude, longitude: e.longitude }));
  const magnitudes = events.map((e) => e.magnitude);

  return (
    <View style={styles.wrap}>
      <AzoresMiniMap points={points} magnitudes={magnitudes} />
      {events.length > 0 ? (
        <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
          {t('hubSeismicPreviewCount', { count: events.length })}
        </Text>
      ) : (
        <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
          {t('hubSeismicCalm')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'stretch' },
});
