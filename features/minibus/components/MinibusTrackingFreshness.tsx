import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildTrackingFreshnessLabels } from '@/features/minibus/lib/trackingFreshness';
import { space, typography } from '@/lib/tokens';
import type { MinibusTrackingMeta } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  meta?: MinibusTrackingMeta | null;
  isFetching?: boolean;
};

const RELATIVE_TICK_MS = 30_000;

export function MinibusTrackingFreshness({ meta, isFetching = false }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), RELATIVE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const labels = useMemo(
    () =>
      buildTrackingFreshnessLabels(
        meta,
        {
          relative: ({ count, unit }) =>
            unit === 'second'
              ? t('minibusLiveLastUpdatedSeconds', { count })
              : t('minibusLiveLastUpdatedMinutes', { count }),
          intervalSeconds: (count) => t('minibusLiveUpdateIntervalSeconds', { count }),
          intervalMinutes: (count) => t('minibusLiveUpdateIntervalMinutes', { count }),
        },
        nowMs,
      ),
    [meta, nowMs, t],
  );

  if (!labels) {
    return null;
  }

  const showUpdating = isFetching && meta != null;

  return (
    <View style={styles.wrap}>
      <View style={styles.textWrap}>
        {labels.relativeTime ? (
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('minibusLiveLastUpdated', { relative: labels.relativeTime })}
          </Text>
        ) : null}
        {labels.intervalTime ? (
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('minibusLiveUpdateInterval', { interval: labels.intervalTime })}
          </Text>
        ) : null}
      </View>
      {showUpdating ? (
        <View style={styles.updating}>
          <ActivityIndicator size="small" color={theme.muted} />
          <Text style={[typography.caption, { color: theme.muted }]}>
            {t('minibusLiveUpdating')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    gap: space.xs,
  },
  textWrap: {
    gap: 2,
  },
  updating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
