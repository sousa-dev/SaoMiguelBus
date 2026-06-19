import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { hasCoordinates, displayStopSequence } from '@/features/minibus/stopCoordinates';
import type { MinibusNetworkStop } from '@/lib/types';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  stops: MinibusNetworkStop[];
  lineColor: string;
  selectedStopKey?: string | null;
  onStopPress?: (stopKey: string) => void;
};

export function MinibusLineStopsList({
  stops,
  lineColor,
  selectedStopKey = null,
  onStopPress,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (stops.length === 0) {
    return null;
  }

  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);

  return (
    <Card style={styles.card}>
      <Text style={[typography.headline, { color: theme.text, marginBottom: space.sm }]}>
        {t('minibusLineRoute')}
      </Text>
      {ordered.map((stop, index) => {
        const isLast = index === ordered.length - 1;
        const transfers = stop.interchange_lines.filter(Boolean);
        const isSelected = selectedStopKey === stop.key;
        const canFocusOnMap = Boolean(onStopPress) && hasCoordinates(stop);

        const stopName = (
          <Text
            style={[
              typography.body,
              {
                color: theme.text,
                fontWeight: isSelected ? '700' : '400',
              },
            ]}
          >
            {stop.name_pt}
          </Text>
        );

        return (
          <View key={stop.key} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.bullet, { backgroundColor: lineColor }]}>
                <Text style={styles.bulletText}>{displayStopSequence(stop, stops)}</Text>
              </View>
              {!isLast ? <View style={[styles.connector, { backgroundColor: theme.border }]} /> : null}
            </View>
            <View
              style={[
                styles.stopBody,
                !isLast && styles.stopBodySpaced,
                isSelected && { backgroundColor: theme.surfaceVariant, borderRadius: radius.sm },
              ]}
            >
              {canFocusOnMap ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('minibusViewStopOnMap', { stop: stop.name_pt })}
                  onPress={() => onStopPress?.(stop.key)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  {stopName}
                </Pressable>
              ) : (
                stopName
              )}
              {transfers.length > 0 ? (
                <Text style={[typography.caption, { color: theme.muted, marginTop: 2 }]}>
                  {t('minibusInterchangeWith', { lines: transfers.join(', ') })}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rail: { alignItems: 'center', width: 28 },
  bullet: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: { color: '#111', fontSize: 12, fontWeight: '800' },
  connector: { width: 2, flex: 1, minHeight: space.md, marginVertical: 2 },
  stopBody: { flex: 1, paddingTop: 4, paddingHorizontal: space.xs },
  stopBodySpaced: { paddingBottom: space.sm },
  pressed: { opacity: 0.7 },
});
