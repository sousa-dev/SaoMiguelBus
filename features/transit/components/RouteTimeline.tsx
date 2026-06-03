import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatTravelDuration, splitStopLabel } from '@/lib/transit-format';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  startTime: string;
  endTime: string;
  originName: string;
  destinationName: string;
};

export function RouteTimeline({ startTime, endTime, originName, destinationName }: Props) {
  const theme = useAppTheme();
  const duration = formatTravelDuration(startTime, endTime);
  const origin = splitStopLabel(originName);
  const destination = splitStopLabel(destinationName);

  return (
    <View style={styles.wrap}>
      <View style={styles.timeRow}>
        <Text style={[styles.time, { color: theme.text }]}>{startTime}</Text>
        <View style={styles.lineWrap}>
          <View style={[styles.line, { backgroundColor: theme.border }]} />
          <View style={[styles.durationBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[typography.caption, { color: theme.muted }]}>{duration}</Text>
          </View>
        </View>
        <Text style={[styles.time, { color: theme.text }]}>{endTime}</Text>
      </View>
      <View style={styles.stopsRow}>
        <View style={styles.stopCol}>
          <Text style={[typography.body, { color: theme.text, textAlign: 'center' }]} numberOfLines={2}>
            {origin.title}
          </Text>
          {origin.subtitle ? (
            <Text style={[typography.caption, { color: theme.muted, textAlign: 'center' }]} numberOfLines={2}>
              {origin.subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.spacer} />
        <View style={styles.stopCol}>
          <Text style={[typography.body, { color: theme.text, textAlign: 'center' }]} numberOfLines={2}>
            {destination.title}
          </Text>
          {destination.subtitle ? (
            <Text style={[typography.caption, { color: theme.muted, textAlign: 'center' }]} numberOfLines={2}>
              {destination.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  time: { fontSize: 24, fontWeight: '700', width: '25%', textAlign: 'center' },
  lineWrap: { flex: 1, height: 24, justifyContent: 'center', marginHorizontal: space.sm },
  line: { height: 2, width: '100%' },
  durationBadge: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  stopsRow: { flexDirection: 'row' },
  stopCol: { width: '40%' },
  spacer: { flex: 1 },
});
