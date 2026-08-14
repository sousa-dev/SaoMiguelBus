import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateView';
import { SchedulePreviewStrip } from '@/features/transit/components/SchedulePreviewNotice';
import { TariffTable } from '@/features/transit/components/TariffTable';
import { useTariffs } from '@/features/transit/hooks/useTariffs';
import { resolveTariffsState } from '@/features/transit/lib/tariffs';
import { track } from '@/lib/analytics';
import { formatAppDate } from '@/lib/date-format';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/**
 * Fare tables (03 §6).
 *
 * The screen shows TABLES, never a computed fare. `fareUnitType: "km"` bands
 * exist, but nothing upstream gives kilometres between two stops, so "what will
 * this ride cost?" cannot ship — there is deliberately no calculate-my-fare
 * affordance here and no price attached to a result card.
 *
 * No price literal appears in this file. Every number renders from the payload;
 * an empty payload renders an empty state, never a fallback price.
 */
export default function TransitPricesScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useTariffs();

  const state = resolveTariffsState(data, error);

  useEffect(() => {
    if (state === 'ready' && data) {
      track('transit', 'prices_viewed', {
        effective_date: data.effectiveDate ?? '',
        is_future: data.isFuture,
      });
    }
  }, [state, data]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.title, { color: theme.text }]}>{t('transitPricesTitle')}</Text>

        {isLoading ? <LoadingState /> : null}

        {!isLoading && state === 'unavailable' ? (
          <ErrorState
            title={t('transitPricesUnavailable')}
            actionLabel={t('retry')}
            onAction={() => void refetch()}
          />
        ) : null}

        {!isLoading && state === 'empty' ? (
          <EmptyState title={t('transitPricesEmpty')} />
        ) : null}

        {state === 'ready' && data ? (
          <>
            {/* Published but not yet in force — the same treatment as preview results. */}
            {data.isFuture ? <SchedulePreviewStrip /> : null}

            <View style={[styles.meta, { borderColor: theme.border, backgroundColor: theme.card }]}>
              {data.effectiveDate ? (
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {t('transitPricesEffective', {
                    date: formatAppDate(new Date(data.effectiveDate)),
                  })}
                </Text>
              ) : null}
              {data.lastUpdatedAt ? (
                <Text style={[typography.caption, { color: theme.muted }]}>
                  {t('transitPricesUpdated', {
                    date: formatAppDate(new Date(data.lastUpdatedAt)),
                  })}
                </Text>
              ) : null}
            </View>

            {data.categories.map((category) => (
              <View key={category.name} style={styles.section}>
                <Text style={[typography.headline, { color: theme.text }]}>{category.name}</Text>
                {category.tariffs.map((tariff) => (
                  <TariffTable key={tariff.name} tariff={tariff} />
                ))}
              </View>
            ))}

            {data.notes ? (
              <Text style={[typography.caption, { color: theme.muted }]}>{data.notes}</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
  meta: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.xs },
  section: { gap: space.sm },
});
