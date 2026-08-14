import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { tariffRenderer, tariffRows, type Tariff } from '@/features/transit/lib/tariffs';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * One tariff, rendered from the payload (03 §6).
 *
 * Band labels are strings — "0 a 5", "6 a 7", "8" — and are printed verbatim, in
 * payload order. Parsing them into ranges or sorting them numerically would
 * reorder a table the operator laid out deliberately.
 *
 * There is no price in this file. Every number comes from the data.
 */
export function TariffTable({ tariff }: { tariff: Tariff }) {
  const theme = useAppTheme();
  const rows = tariffRows(tariff);
  const banded = tariffRenderer(tariff) === 'banded';

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[typography.label, { color: theme.text }]}>{tariff.name}</Text>
      {tariff.note ? (
        <Text style={[typography.caption, { color: theme.muted }]}>{tariff.note}</Text>
      ) : null}

      {rows.map((row, index) => (
        <View key={`${row.band ?? 'single'}-${index}`} style={styles.row}>
          {banded && row.band ? (
            <Text style={[typography.body, { color: theme.muted, flex: 1 }]}>{row.band}</Text>
          ) : (
            <View style={styles.spacer} />
          )}
          <Text style={[typography.bodyStrong, { color: theme.text }]}>{row.price}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: 2,
  },
  spacer: { flex: 1 },
});
