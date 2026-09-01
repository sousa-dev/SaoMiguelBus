import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListFilter } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { CheckRow } from '@/features/live-tracking/components/CheckRow';
import { azoresbusColorHex, toggleLineCode } from '@/features/azoresbus/lib/vehicleLine';
import { trackLiveFilterSheet } from '@/features/azoresbus/lib/live-analytics';
import { foldForSearch } from '@/lib/stop-search';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import type { AzoresbusRoute } from '@/lib/types';
import { useAppTheme } from '@/lib/theme';

type Props = {
  lines: AzoresbusRoute[];
  selectedLineCodes: string[];
  onChange: (codes: string[]) => void;
};

/**
 * Line filter as a searchable checklist rather than a row of chips.
 *
 * Twenty-six chips in a horizontal scroller means swiping blind through
 * near-identical pills to find one number. A trigger that names the current
 * selection, opening a searchable list, turns that into typing two digits.
 *
 * Empty selection means every line — see `filterVehiclesByLineCodes`.
 */
export function AzoresbusLineSelect({ lines, selectedLineCodes, onChange }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const folded = foldForSearch(query);
    if (!folded) {
      return lines;
    }
    // No minimum length here: `lib/stop-search` requires three characters
    // because it searches 816 stops, but a line code can be two.
    return lines.filter((line) =>
      foldForSearch(`${line.nameShort} ${line.name}`).includes(folded),
    );
  }, [lines, query]);

  const count = selectedLineCodes.length;
  const active = count > 0;

  const triggerLabel = active
    ? count === 1
      ? t('azoresbusLiveFilterLine', { line: selectedLineCodes[0] })
      : t('azoresbusLiveFilterCount', { count })
    : t('azoresbusLiveFilterAll');

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('azoresbusLiveFilterTitle')}
        onPress={() => {
          trackLiveFilterSheet('open');
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: active ? theme.primary : theme.surfaceVariant,
            borderColor: active ? theme.primary : theme.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <ListFilter
          size={iconSize.sm}
          color={active ? theme.onPrimary : theme.muted}
          strokeWidth={2}
        />
        <Text
          style={[typography.label, { color: active ? theme.onPrimary : theme.text }]}
          numberOfLines={1}
        >
          {triggerLabel}
        </Text>
      </Pressable>

      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('azoresbusLiveFilterClear')}
          onPress={() => {
            trackLiveFilterSheet('clear');
            onChange([]);
          }}
          style={styles.clear}
        >
          <Text style={[typography.caption, { color: theme.primary }]}>
            {t('azoresbusLiveFilterClear')}
          </Text>
        </Pressable>
      ) : null}

      {/* scrollable={false}: the body scrolls itself, and nesting scrollables
          breaks the inner one. 26 rows does not need virtualising. */}
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t('azoresbusLiveFilterTitle')}
        scrollable={false}
      >
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('azoresbusLiveFilterSearch')}
          onClear={() => setQuery('')}
        />

        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {filtered.length === 0 ? (
            <Text style={[typography.caption, styles.empty, { color: theme.muted }]}>
              {t('azoresbusLiveFilterNoMatch')}
            </Text>
          ) : (
            filtered.map((line) => (
              <CheckRow
                key={line.nameShort}
                label={t('azoresbusLiveFilterLine', { line: line.nameShort })}
                subtitle={line.name}
                accentColor={azoresbusColorHex(line.color)}
                checked={selectedLineCodes.includes(line.nameShort)}
                onToggle={() => onChange(toggleLineCode(selectedLineCodes, line.nameShort))}
              />
            ))
          )}
        </ScrollView>

        <View style={styles.actions}>
          {active ? (
            <Button
              label={t('azoresbusLiveFilterClear')}
              variant="outline"
              size="md"
              onPress={() => {
                trackLiveFilterSheet('clear');
                onChange([]);
              }}
              style={styles.action}
            />
          ) : null}
          <Button
            label={t('azoresbusLiveFilterApply')}
            size="md"
            onPress={() => setOpen(false)}
            style={styles.action}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 1,
  },
  clear: { paddingVertical: space.sm, paddingHorizontal: space.sm },
  list: { maxHeight: 320 },
  empty: { paddingVertical: space.lg, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  action: { flex: 1 },
});
