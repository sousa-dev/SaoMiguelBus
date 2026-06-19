import { ArrowRight, ArrowsUpFromLine } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import type { MinibusJourney } from '@/lib/types';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  journey: MinibusJourney;
};

export function MinibusJourneyCard({ journey }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const summary =
    journey.transfers === 0
      ? t('minibusDirectJourney')
      : t('minibusTransfersCount', { count: journey.transfers });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[typography.label, { color: theme.text }]}>{summary}</Text>
        <Text style={[typography.caption, { color: theme.muted }]}>
          {t('minibusStopsCount', { count: journey.total_stops })}
        </Text>
      </View>

      {journey.legs.map((leg, index) => (
        <View key={`${leg.line_code}-${leg.board.key}`}>
          {index > 0 ? (
            <View style={styles.transferRow}>
              <ArrowsUpFromLine size={14} color={theme.muted} strokeWidth={2} />
              <Text style={[typography.caption, { color: theme.muted }]}>
                {t('minibusTransferAt', {
                  stop: journey.transfer_stops[index - 1]?.name ?? leg.board.name,
                })}
              </Text>
            </View>
          ) : null}

          <View style={styles.legRow}>
            <View style={[styles.badge, { backgroundColor: leg.line_color ?? theme.primary }]}>
              <Text style={styles.badgeText}>{leg.line_code}</Text>
            </View>
            <View style={styles.legBody}>
              {leg.line_name ? (
                <Text style={[typography.label, { color: theme.text }]}>{leg.line_name}</Text>
              ) : null}
              <View style={styles.stopsRow}>
                <Text style={[typography.body, { color: theme.text, flexShrink: 1 }]}>
                  {leg.board.name}
                </Text>
                <ArrowRight size={14} color={theme.muted} strokeWidth={2} />
                <Text style={[typography.body, { color: theme.text, flexShrink: 1 }]}>
                  {leg.alight.name}
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.muted }]}>
                {t('minibusStopsCount', { count: leg.num_stops })}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xs,
    paddingLeft: space.xl,
  },
  legRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  badge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#111', fontWeight: '800' },
  legBody: { flex: 1, gap: 2 },
  stopsRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
});
