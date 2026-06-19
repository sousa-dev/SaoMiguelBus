import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import type { MinibusTariff } from '@/lib/types';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  tariffs: MinibusTariff[];
  effectiveDate?: string | null;
};

export function MinibusTariffTable({ tariffs, effectiveDate }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Card style={styles.card}>
      <Text style={[typography.headline, { color: theme.text }]}>{t('minibusTariffs')}</Text>
      {effectiveDate ? (
        <Text style={[typography.caption, { color: theme.muted, marginBottom: space.sm }]}>
          {t('minibusTariffsEffective', { date: effectiveDate })}
        </Text>
      ) : null}
      {tariffs.map((tariff, index) => (
        <View
          key={tariff.key}
          style={[
            styles.row,
            index < tariffs.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{tariff.label}</Text>
          <Text style={[typography.body, { color: theme.text, fontWeight: '700' }]}>
            {t('minibusPriceEur', { price: tariff.price_eur })}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, gap: space.sm },
});
