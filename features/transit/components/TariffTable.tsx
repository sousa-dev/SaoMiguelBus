import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  fareBandUnit,
  formatTariffPrice,
  tariffRenderer,
  tariffRows,
  type Tariff,
} from '@/features/transit/lib/tariffs';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * One tariff, rendered from the payload (03 §6).
 *
 * The band labels are DISTANCES in the unit the payload declares — "0 a 5" means
 * a journey of up to 5 km, not a zone or a ticket count. Without that stated,
 * the table is a column of bare numbers next to prices. The unit comes from
 * `fareUnitType` rather than being assumed, so a restructured payload still
 * renders its own unit.
 *
 * Labels are printed verbatim, in payload order. Parsing them into ranges or
 * sorting them numerically would reorder a table the operator laid out.
 *
 * There is no price in this file. Every amount comes from the payload; only the
 * currency and the local grouping convention are ours.
 */
export function TariffTable({ tariff }: { tariff: Tariff }) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const rows = tariffRows(tariff);
  const unit = fareBandUnit(tariff);
  const banded = tariffRenderer(tariff) === 'banded';

  const bandHeader =
    unit === 'km'
      ? t('transitFaresBandKm')
      : t('transitFaresBandGeneric', { unit: unit ?? '' });

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[typography.label, { color: theme.text }]}>{tariff.name}</Text>
      {tariff.note ? (
        <Text style={[typography.caption, { color: theme.muted }]}>{tariff.note}</Text>
      ) : null}

      {banded && unit ? (
        <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
          <Text style={[typography.overline, { color: theme.muted, flex: 1 }]}>{bandHeader}</Text>
          <Text style={[typography.overline, { color: theme.muted }]}>
            {t('transitFaresPriceHeader')}
          </Text>
        </View>
      ) : null}

      {rows.map((row, index) => (
        <View key={`${row.band ?? 'single'}-${index}`} style={styles.row}>
          {banded && row.band ? (
            <Text style={[typography.body, { color: theme.muted, flex: 1 }]}>{row.band}</Text>
          ) : (
            <View style={styles.spacer} />
          )}
          <Text style={[typography.bodyStrong, { color: theme.text }]}>
            {formatTariffPrice(row.price, i18n.language)}
          </Text>
        </View>
      ))}

      {/*
        Saying the bands are kilometres invites "so how far is my trip?" — and
        nothing upstream gives distance between two stops, so the app cannot
        answer it (98 §4 gap "Fare distance"). Say so rather than imply a
        calculator that does not exist.
      */}
      {banded && unit ? (
        <Text style={[typography.caption, { color: theme.muted }]}>
          {t('transitFaresDistanceNote')}
        </Text>
      ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: space.xs,
    marginTop: space.xs,
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
