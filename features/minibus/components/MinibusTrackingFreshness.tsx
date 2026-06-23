import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Radio } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { buildTrackingFreshnessLabels } from '@/features/minibus/lib/trackingFreshness';
import { radius, space, typography } from '@/lib/tokens';
import type { MinibusTrackingMeta } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  meta?: MinibusTrackingMeta | null;
  isFetching?: boolean;
};

export function MinibusTrackingFreshness({ meta, isFetching = false }: Props) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const labels = useMemo(
    () =>
      buildTrackingFreshnessLabels(
        meta,
        {
          intervalSeconds: (count) => t('minibusLiveUpdateIntervalSeconds', { count }),
          intervalMinutes: (count) => t('minibusLiveUpdateIntervalMinutes', { count }),
        },
        i18n.language,
      ),
    [i18n.language, meta, t],
  );

  if (!labels) {
    return null;
  }

  const showUpdating = isFetching && meta != null;

  const captionStyle = [typography.caption, { color: theme.muted }];

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.liveBadge, { backgroundColor: theme.danger }]}>
          <Radio size={10} color={theme.onDanger} strokeWidth={2.5} />
          <Text style={[styles.liveBadgeText, { color: theme.onDanger }]}>
            {t('minibusLiveCta')}
          </Text>
        </View>
        <View style={styles.textWrap}>
          {labels.updatedAtTime ? (
            <Text style={captionStyle} numberOfLines={1}>
              {t('minibusLiveLastUpdated', { time: labels.updatedAtTime })}
            </Text>
          ) : null}
          {labels.updatedAtTime && labels.intervalTime ? (
            <Text style={captionStyle}>{' · '}</Text>
          ) : null}
          {labels.intervalTime ? (
            <Text style={captionStyle} numberOfLines={1}>
              {t('minibusLiveUpdateInterval', { interval: labels.intervalTime })}
            </Text>
          ) : null}
        </View>
      </View>
      {showUpdating ? (
        <View style={styles.updating}>
          <ActivityIndicator size="small" color={theme.muted} />
          <Text style={captionStyle}>{t('minibusLiveUpdating')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minWidth: 0,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  liveBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  textWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    minWidth: 0,
  },
  updating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 0,
  },
});
