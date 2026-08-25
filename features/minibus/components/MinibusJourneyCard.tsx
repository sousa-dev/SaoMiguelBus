import { ArrowRight, ArrowsUpFromLine, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { formatServiceSummary } from '@/features/minibus/serviceSummary';
import type { MinibusJourney, MinibusLine } from '@/lib/types';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  journey: MinibusJourney;
  linesByCode: Map<string, MinibusLine>;
  onPress?: () => void;
};

export function MinibusJourneyCard({ journey, linesByCode, onPress }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const summary =
    journey.transfers === 0
      ? t('minibusDirectJourney')
      : t('minibusTransfersCount', { count: journey.transfers });

  const content = (
    <>
      <View style={styles.header}>
        <Text style={[typography.label, { color: theme.text }]}>{summary}</Text>
        <View style={styles.headerRight}>
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('minibusStopsCount', { count: journey.total_stops })}
          </Text>
          {onPress ? <ChevronRight size={iconSize.sm} color={theme.muted} strokeWidth={2} /> : null}
        </View>
      </View>

      {journey.legs.map((leg, index) => {
        const line = linesByCode.get(leg.line_code);
        const hours = line ? formatServiceSummary(line.service_summary, t) : '';

        return (
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
              {hours ? (
                <Text style={[typography.caption, { color: theme.muted }]}>{hours}</Text>
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
        );
      })}
    </>
  );

  if (!onPress) {
    return <Card style={styles.card}>{content}</Card>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('minibusViewDirections')}
      onPress={onPress}
    >
      <Card style={styles.card}>{content}</Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.sm, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
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
