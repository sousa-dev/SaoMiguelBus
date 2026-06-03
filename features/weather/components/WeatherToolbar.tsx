import { LayoutGrid, List as ListIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { SearchField } from '@/components/ui/SearchField';
import type { WeatherViewMode } from '@/features/weather/filterHelpers';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import type { AppTheme } from '@/lib/theme';

export function WeatherToolbar({
  theme,
  searchQuery,
  onSearchChange,
  concelhos,
  selectedConcelho,
  onSelectConcelho,
  viewMode,
  onViewModeChange,
}: {
  theme: AppTheme;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  concelhos: string[];
  selectedConcelho: string | null;
  onSelectConcelho: (concelho: string | null) => void;
  viewMode: WeatherViewMode;
  onViewModeChange: (mode: WeatherViewMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <SearchField
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder={t('weatherSearchPlaceholder')}
        accessibilityLabel={t('weatherSearchPlaceholder')}
      />

      <Text style={[typography.overline, styles.filterLabel, { color: theme.muted }]}>
        {t('weatherFilterConcelho')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={t('weatherFilterAll')}
          selected={selectedConcelho == null}
          onPress={() => onSelectConcelho(null)}
        />
        {concelhos.map((concelho) => (
          <Chip
            key={concelho}
            label={concelho}
            selected={selectedConcelho === concelho}
            onPress={() => onSelectConcelho(concelho)}
          />
        ))}
      </ScrollView>

      <View style={styles.toggleRow}>
        {(['list', 'grid'] as const).map((mode) => {
          const active = viewMode === mode;
          const Icon = mode === 'list' ? ListIcon : LayoutGrid;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={t(mode === 'list' ? 'weatherViewList' : 'weatherViewGrid')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  filterLabel: { marginTop: space.md, marginBottom: space.xs },
  chips: { flexDirection: 'row', paddingBottom: space.xs },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xs, marginTop: space.sm },
  toggleBtn: {
    width: 40,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
