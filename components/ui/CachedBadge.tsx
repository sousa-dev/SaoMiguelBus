import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

function formatAge(input: string | number): string {
  const then = typeof input === 'number' ? input : Date.parse(input);
  if (Number.isNaN(then)) {
    return '';
  }
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) {
    return '1m';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

/** Small pill indicating content is served from cache (optionally with age). */
export function CachedBadge({ date, label }: { date?: string | number | null; label?: string }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const age = date != null ? formatAge(date) : '';
  const text = age ? t('cachedBadgeAge', { age }) : (label ?? t('cachedBadge'));

  return (
    <View
      style={[styles.pill, { backgroundColor: theme.surfaceVariant }]}
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <Check size={12} color={theme.muted} strokeWidth={2.5} />
      <Text style={[typography.caption, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
});
