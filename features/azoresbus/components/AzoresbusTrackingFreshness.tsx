import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Radio } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { azoresbusFreshnessLabels } from '@/features/azoresbus/lib/trackingFreshness';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  /** react-query's `dataUpdatedAt`; undefined until the first response lands. */
  updatedAt?: number;
  isRefetching?: boolean;
};

/**
 * The AO VIVO pill, plus a client-derived "updated at · every 10s" caption.
 *
 * Unlike the minibus original this NEVER returns null. That component bails out
 * when the server sends no cache metadata, which is every single response here —
 * so a faithful copy would render nothing at all. The pill is the one piece of
 * the UI that tells a rider the dots are moving on their own, and it has to be
 * on screen from the first frame, before any data has arrived. Only the caption
 * beside it waits for something real to say.
 */
export function AzoresbusTrackingFreshness({ updatedAt, isRefetching = false }: Props) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const labels = useMemo(
    () =>
      azoresbusFreshnessLabels(
        updatedAt,
        {
          intervalSeconds: (count) => t('azoresbusLiveUpdateIntervalSeconds', { count }),
          intervalMinutes: (count) => t('azoresbusLiveUpdateIntervalMinutes', { count }),
        },
        Date.now(),
        i18n.language,
      ),
    // `updatedAt` changing is what makes this recompute; Date.now() is read at
    // render time on purpose, since the caption only needs to be right when the
    // data it describes changes.
    [i18n.language, t, updatedAt],
  );

  const captionStyle = [typography.caption, { color: theme.muted }];

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.liveBadge, { backgroundColor: theme.danger }]}>
          <Radio size={10} color={theme.onDanger} strokeWidth={2.5} />
          <Text style={[styles.liveBadgeText, { color: theme.onDanger }]}>
            {t('azoresbusLiveCta')}
          </Text>
        </View>
        <View style={styles.textWrap}>
          {labels?.updatedAtTime ? (
            <Text style={captionStyle} numberOfLines={1}>
              {t('azoresbusLiveLastUpdated', { time: labels.updatedAtTime })}
            </Text>
          ) : null}
          {labels?.updatedAtTime && labels?.intervalTime ? (
            <Text style={captionStyle}>{' · '}</Text>
          ) : null}
          {labels?.intervalTime ? (
            <Text style={captionStyle} numberOfLines={1}>
              {t('azoresbusLiveUpdateInterval', { interval: labels.intervalTime })}
            </Text>
          ) : null}
        </View>
      </View>
      {isRefetching ? (
        <View style={styles.updating}>
          <ActivityIndicator size="small" color={theme.muted} />
          <Text style={captionStyle}>{t('azoresbusLiveUpdating')}</Text>
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
