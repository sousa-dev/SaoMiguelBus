import { useState } from 'react';
import { LayoutGrid, List as ListIcon, SlidersHorizontal } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { TrailFilters } from '@/features/trails/components/TrailFilters';
import { countActiveTrailFilters, hasActiveTrailFilters } from '@/features/trails/filterHelpers';
import type { TrailListFilters } from '@/features/trails/hooks/useTrailQueries';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export type TrailsViewMode = 'list' | 'grid';

export function TrailsToolbar({
  filters,
  onChangeFilters,
  onClearFilters,
  query,
  onChangeQuery,
  viewMode,
  onViewModeChange,
}: {
  filters: TrailListFilters;
  onChangeFilters: (next: TrailListFilters) => void;
  onClearFilters: () => void;
  query: string;
  onChangeQuery: (value: string) => void;
  viewMode: TrailsViewMode;
  onViewModeChange: (mode: TrailsViewMode) => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeCount = countActiveTrailFilters(filters);
  const hasActive = hasActiveTrailFilters(filters);

  const openSheet = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOpen(true);
  };

  return (
    <View style={styles.wrap}>
      <SearchField
        value={query}
        onChangeText={onChangeQuery}
        placeholder={t('trailsSearchPlaceholder')}
        accessibilityLabel={t('trailsSearchPlaceholder')}
      />

      <View style={styles.row}>
        <View style={styles.toggleRow}>
          {(['list', 'grid'] as const).map((mode) => {
            const active = viewMode === mode;
            const Icon = mode === 'list' ? ListIcon : LayoutGrid;
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={t(mode === 'list' ? 'trailsViewList' : 'trailsViewGrid')}
                accessibilityState={{ selected: active }}
                onPress={() => onViewModeChange(mode)}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceVariant,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Icon size={iconSize.sm} color={active ? theme.onPrimary : theme.muted} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterSide}>
          {hasActive ? (
            <Button label={t('trailsFilterClear')} variant="ghost" size="sm" onPress={onClearFilters} />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('trailsFiltersButton')}
            onPress={openSheet}
            style={({ pressed }) => [
              styles.trigger,
              {
                backgroundColor: hasActive ? theme.primary : theme.surfaceVariant,
                borderColor: hasActive ? theme.primary : theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <SlidersHorizontal
              size={iconSize.sm}
              color={hasActive ? theme.onPrimary : theme.muted}
              strokeWidth={2}
            />
            <Text style={[typography.label, { color: hasActive ? theme.onPrimary : theme.text }]}>
              {t('trailsFiltersButton')}
            </Text>
            {activeCount > 0 ? (
              <View style={[styles.count, { backgroundColor: hasActive ? theme.onPrimary : theme.primary }]}>
                <Text
                  style={[typography.caption, styles.countText, { color: hasActive ? theme.primary : theme.onPrimary }]}
                >
                  {activeCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('trailsFiltersTitle')}>
        <TrailFilters filters={filters} onChange={onChangeFilters} onClear={onClearFilters} />
        <View style={styles.sheetActions}>
          <Button label={t('trailsFilterApply')} size="md" onPress={() => setOpen(false)} fullWidth />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleRow: { flexDirection: 'row', gap: space.xs },
  filterSide: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  toggleBtn: {
    width: 40,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: { fontWeight: '700' },
  sheetActions: { paddingHorizontal: space.lg, marginTop: space.md },
});
