import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { trafficCategoryIcon } from '@/lib/traffic-icons';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { withAlpha } from '@/lib/color-utils';
import type { TrafficReport } from '@/lib/types';

const MAX_CHIPS = 3;

type HubTrafficPreviewProps = {
  reports: TrafficReport[];
  accent: string;
};

export function HubTrafficPreview({ reports, accent }: HubTrafficPreviewProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const chips = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    for (const r of reports) {
      if (r.status !== 'active') {
        continue;
      }
      const slug = r.category.slug;
      const prev = counts.get(slug);
      if (prev) {
        prev.count += 1;
      } else {
        counts.set(slug, { slug, name: r.category.name, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [reports]);

  if (chips.length === 0) {
    return null;
  }

  const visible = chips.slice(0, MAX_CHIPS);
  const overflow = chips.length - visible.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {visible.map((chip) => {
          const Icon = trafficCategoryIcon(chip.slug);
          return (
            <View
              key={chip.slug}
              style={[
                styles.chip,
                {
                  backgroundColor: withAlpha(accent, 0.12),
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Icon color={accent} size={14} strokeWidth={2} />
              <Text style={[typography.caption, styles.chipCount, { color: theme.text }]}>
                {chip.count}
              </Text>
            </View>
          );
        })}
        {overflow > 0 ? (
          <Text style={[typography.caption, { color: theme.muted }]}>+{overflow}</Text>
        ) : null}
      </View>
      <Text style={[typography.caption, { color: theme.muted, marginTop: 4 }]} numberOfLines={1}>
        {t('hubTrafficPreviewCount', { count: reports.filter((r) => r.status === 'active').length })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  chipCount: { fontWeight: '600', fontSize: 12 },
});
