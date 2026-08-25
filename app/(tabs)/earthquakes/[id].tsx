import { Activity, Share2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, MapPin, Waves } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateView';
import { FeltVoteSheet } from '@/features/earthquakes/components/FeltVoteSheet';
import { onColorFor } from '@/lib/color-utils';
import { formatAppDateTime } from '@/lib/date-format';
import { formatRelativeTime } from '@/lib/format-time';
import { magnitudeColor } from '@/lib/seismic-colors';
import { seismicEventHeadline } from '@/lib/seismic-display';
import { useSeismicEvent } from '@/features/earthquakes/hooks/useEarthquakeQueries';
import { useFabActions } from '@/lib/fab-store';
import { track } from '@/lib/analytics';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function EarthquakeDetailScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const event = useSeismicEvent(eventId, Number.isFinite(eventId));
  const [feltOpen, setFeltOpen] = useState(false);

  const fabActions = useMemo(() => {
    const data = event.data;
    if (!data) {
      return [];
    }
    return [
      {
        key: 'felt-it',
        labelKey: 'fabFeltIt',
        icon: Activity,
        onPress: () => setFeltOpen(true),
      },
      {
        key: 'share-event',
        labelKey: 'fabShareEvent',
        icon: Share2,
        onPress: () => {
          const when = formatAppDateTime(data.occurredAt);
          const headline = seismicEventHeadline(data, t) ?? data.region ?? '—';
          const message = `M${data.magnitude.toFixed(1)} — ${headline} (${when})`;
          void Share.share({ message, title: headline });
        },
      },
    ];
  }, [event.data, t]);

  useFabActions(fabActions);

  useEffect(() => {
    if (event.data) {
      track('seismic', 'open', { event_id: event.data.id, magnitude: event.data.magnitude });
    }
  }, [event.data?.id]);

  if (event.isLoading) {
    return (
      <Screen withStackHeader>
        <LoadingState />
      </Screen>
    );
  }

  if (!event.data) {
    return (
      <Screen withStackHeader>
        <ErrorState title={t('seismicNotFound')} />
      </Screen>
    );
  }

  const data = event.data;
  const headline = seismicEventHeadline(data, t);
  const feltYes = data.feltYesCount ?? data.feltCount ?? 0;

  const openOnSeismicMap = () => {
    track('seismic', 'view', { screen: 'map', source: 'detail', event_id: data.id });
    router.replace({
      pathname: '/(tabs)/earthquakes',
      params: {
        focusLat: String(data.latitude),
        focusLng: String(data.longitude),
        focusId: String(data.id),
      },
    });
  };
  const feltNo = data.feltNoCount ?? 0;
  const magColor = magnitudeColor(theme, data.magnitude);
  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <Card elevated style={styles.hero}>
          <View style={[styles.magRing, { backgroundColor: magColor }]}>
            <Text style={[styles.magText, { color: onColorFor(magColor) }]}>
              M{data.magnitude.toFixed(1)}
            </Text>
          </View>
          {headline ? (
            <Text style={[typography.title, { color: theme.text, marginTop: space.lg, textAlign: 'center' }]}>
              {headline}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Clock size={iconSize.sm} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted }]}>
              {formatRelativeTime(data.occurredAt, i18n.language) ||
                formatAppDateTime(data.occurredAt)}
            </Text>
          </View>
          <Badge label={t('seismicDepth', { depth: data.depthKm ?? '—' })} tone="neutral" />
        </Card>

        <Card style={styles.mapCard}>
          <MapPin size={iconSize.lg} color={theme.primary} />
          <Text style={[typography.body, { color: theme.text, marginTop: space.sm }]}>
            {t('seismicCoords', { lat: data.latitude.toFixed(2), lng: data.longitude.toFixed(2) })}
          </Text>
          <Button
            label={t('seismicOpenMap')}
            variant="outline"
            onPress={openOnSeismicMap}
            fullWidth
            style={{ marginTop: space.md }}
          />
        </Card>

        {(feltYes > 0 || feltNo > 0) && (
          <Card>
            <Waves size={iconSize.md} color={theme.muted} />
            <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>
              {t('seismicFeltYesCount', { count: feltYes })}
              {feltNo > 0 ? ` · ${t('seismicFeltNoCount', { count: feltNo })}` : ''}
            </Text>
          </Card>
        )}

        <Button label={t('seismicFeltButton')} fullWidth onPress={() => setFeltOpen(true)} />

        <FeltVoteSheet
          visible={feltOpen}
          eventId={data.id}
          event={data}
          onClose={() => setFeltOpen(false)}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'], gap: space.md },
  hero: { alignItems: 'center' },
  magRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magText: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginVertical: space.md },
  mapCard: { alignItems: 'center' },
});
