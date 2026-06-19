import { ArrowUpDown, Search } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MinibusStopPicker } from '@/features/minibus/components/MinibusStopPicker';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  origin: string;
  destination: string;
  stops: string[];
  searching?: boolean;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onSwap: () => void;
  onSearch: () => void;
};

export function MinibusPlannerCard({
  origin,
  destination,
  stops,
  searching,
  onOriginChange,
  onDestinationChange,
  onSwap,
  onSearch,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const canSearch = Boolean(origin.trim() && destination.trim());

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor: theme.card, borderColor: theme.border },
        elevation(2, theme.text),
      ]}
    >
      <View style={styles.body}>
        <MinibusStopPicker
          placeholder={t('minibusOrigin')}
          value={origin}
          stops={stops}
          onChangeText={onOriginChange}
        />

        <View style={styles.swapRow}>
          <Pressable
            onPress={onSwap}
            style={[styles.swapBtn, { backgroundColor: theme.primary }]}
            accessibilityRole="button"
            accessibilityLabel={t('minibusSwap')}
          >
            <ArrowUpDown size={16} color={theme.onPrimary} />
          </Pressable>
        </View>

        <MinibusStopPicker
          placeholder={t('minibusDestination')}
          value={destination}
          stops={stops}
          onChangeText={onDestinationChange}
        />

        <Pressable
          onPress={onSearch}
          disabled={!canSearch || searching}
          style={({ pressed }) => [
            styles.searchBtn,
            {
              backgroundColor: theme.primary,
              opacity: !canSearch || searching ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('minibusSearchCta')}
        >
          {searching ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <>
              <Search size={18} color={theme.onPrimary} />
              <Text style={[typography.label, { color: theme.onPrimary, marginLeft: space.sm }]}>
                {t('minibusSearchCta')}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  body: {
    padding: space.md,
  },
  swapRow: { alignItems: 'flex-end', marginVertical: 2 },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    height: 44,
    marginTop: space.md,
  },
});
