import { ChevronDown, ChevronRight, History } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/lib/profile-store';
import { radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  onSelect: (origin: string, destination: string, day: string, time: string) => void;
};

export function RecentSearches({ onSelect }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const recents = useProfileStore((s) => s.recentSearches);
  const clearRecentSearches = useProfileStore((s) => s.clearRecentSearches);
  const [open, setOpen] = useState(false);

  if (recents.length === 0) {
    return null;
  }

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.toggle, { borderColor: theme.border, backgroundColor: theme.card }]}
      >
        <History size={18} color={theme.primary} />
        <Chevron size={18} color={theme.primary} />
        <Text style={[typography.label, { color: theme.primary, flex: 1 }]}>
          {t('transitRecentSearches')} ({recents.length})
        </Text>
      </Pressable>
      {open ? (
        <View style={[styles.panel, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {recents.map((item) => (
            <Pressable
              key={`${item.at}-${item.origin}`}
              onPress={() => onSelect(item.origin, item.destination, item.day, item.time)}
              style={styles.row}
            >
              <Text style={[typography.body, { color: theme.text }]}>
                {item.origin} → {item.destination}
              </Text>
              <Text style={[typography.caption, { color: theme.muted }]}>
                {t(item.day as 'weekday' | 'saturday' | 'sunday')} · {item.time}
              </Text>
            </Pressable>
          ))}
          <Button label={t('transitClearRecents')} variant="ghost" onPress={clearRecentSearches} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.sm },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  panel: {
    marginTop: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  row: { paddingVertical: space.xs, gap: 2 },
});
