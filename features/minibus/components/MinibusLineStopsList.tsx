import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import type { MinibusNetworkStop } from '@/lib/types';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  stops: MinibusNetworkStop[];
  lineColor: string;
};

export function MinibusLineStopsList({ stops, lineColor }: Props) {
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
        return (
          <View key={stop.key} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.bullet, { backgroundColor: lineColor }]}>
                <Text style={styles.bulletText}>{stop.sequence}</Text>
              </View>
              {!isLast ? <View style={[styles.connector, { backgroundColor: theme.border }]} /> : null}
            </View>
            <View style={[styles.stopBody, !isLast && styles.stopBodySpaced]}>
              <Text style={[typography.body, { color: theme.text }]}>{stop.name_pt}</Text>
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
  stopBody: { flex: 1, paddingTop: 4 },
  stopBodySpaced: { paddingBottom: space.sm },
});
