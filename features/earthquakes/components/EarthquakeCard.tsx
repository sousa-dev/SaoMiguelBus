import { Clock } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { iconSize, space, typography } from '@/lib/tokens';
import { onColorFor } from '@/lib/color-utils';
import { formatRelativeTime } from '@/lib/format-time';
import { magnitudeColor } from '@/lib/seismic-colors';
import { seismicEventHeadline, seismicMagnitudeLabel } from '@/lib/seismic-display';
import { useAppTheme } from '@/lib/theme';
import type { SeismicEvent } from '@/lib/types';

export function EarthquakeCard({
  event,
  onPress,
}: {
  event: SeismicEvent;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const headline = seismicEventHeadline(event, t);
  const when = formatRelativeTime(event.occurredAt, i18n.language);
  const magColor = magnitudeColor(theme, event.magnitude);
  const magTone = event.magnitude >= 5 ? 'danger' : event.magnitude >= 3 ? 'primary' : 'neutral';
  const magLabel = seismicMagnitudeLabel(event.magnitude, t);

  const metaParts: string[] = [];
  if (when) {
    metaParts.push(when);
  }
  if (event.depthKm != null) {
    metaParts.push(t('seismicDepthShort', { depth: Math.round(event.depthKm) }));
  }

  return (
    <Card onPress={onPress} elevated style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.magCircle, { backgroundColor: magColor }]}>
          <Text
            style={[
              typography.headline,
              { color: onColorFor(magColor), fontVariant: ['tabular-nums'] },
            ]}
          >
            {event.magnitude.toFixed(1)}
          </Text>
        </View>
        <View style={styles.textCol}>
          {headline ? (
            <Text style={[typography.headline, { color: theme.text }]} numberOfLines={2}>
              {headline}
            </Text>
          ) : null}
          <Text style={[typography.caption, { color: theme.muted }]}>{magLabel}</Text>
          {metaParts.length ? (
            <View style={styles.meta}>
              <Clock size={iconSize.sm} color={theme.muted} />
              <Text style={[typography.caption, { color: theme.muted }]} numberOfLines={1}>
                {metaParts.join('  ·  ')}
              </Text>
            </View>
          ) : null}
          {event.feltCount ? (
            <Badge label={t('seismicFeltCount', { count: event.feltCount })} tone={magTone} />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  row: { flexDirection: 'row', gap: space.md },
  magCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: space.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
});
