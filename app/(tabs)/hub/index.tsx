import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { HubEditControls } from '@/features/hub/components/HubEditControls';
import { HubModuleTile } from '@/features/hub/components/HubModuleTile';
import { resolveEnabledModules, type ModuleKey } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useHubStore } from '@/lib/hub-store';
import { getEnabledHubModules } from '@/lib/modules';
import { useAppTheme } from '@/lib/theme';

export default function HubScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const enabledKeys = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const modules = useMemo(() => getEnabledHubModules(enabledKeys), [enabledKeys]);

  const editMode = useHubStore((s) => s.editMode);
  const layout = useHubStore((s) => s.layout);
  const columns = useHubStore((s) => s.columns);
  const pinnedKeys = useHubStore((s) => s.pinnedKeys);
  const isPinned = useHubStore((s) => s.isPinned);
  const canPinMore = useHubStore((s) => s.canPinMore);
  const togglePin = useHubStore((s) => s.togglePin);
  const reorderPin = useHubStore((s) => s.reorderPin);

  const [pinFullHint, setPinFullHint] = useState(false);
  const listLayout = layout === 'list';
  const numColumns = listLayout ? 1 : columns;

  const onTogglePin = useCallback(
    (key: ModuleKey) => {
      const ok = togglePin(key);
      if (!ok) {
        setPinFullHint(true);
        return;
      }
      setPinFullHint(false);
    },
    [togglePin],
  );

  const pinnedIndex = useCallback(
    (key: ModuleKey) => pinnedKeys.indexOf(key),
    [pinnedKeys],
  );

  return (
    <Screen withStackHeader>
      {editMode ? (
        <HubEditControls theme={theme} pinnedCount={pinnedKeys.length} />
      ) : null}

      {pinFullHint ? (
        <Text style={[styles.fullHint, { color: theme.muted }]}>{t('hubNavbarFull')}</Text>
      ) : null}

      <FlatList
        key={`${layout}-${columns}`}
        data={modules}
        keyExtractor={(item) => item.key}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          !editMode && modules.length > 0 ? (
            <Text style={[styles.subtitle, { color: theme.muted }]}>{t('hubSubtitle')}</Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>{t('hubEmpty')}</Text>
        }
        renderItem={({ item }) => {
          const pinned = isPinned(item.key);
          const idx = pinnedIndex(item.key);
          return (
            <HubModuleTile
              module={item}
              theme={theme}
              editMode={editMode}
              pinned={pinned}
              pinBlocked={!canPinMore()}
              showPinReorder={editMode && pinned}
              canMoveUp={idx > 0}
              canMoveDown={idx >= 0 && idx < pinnedKeys.length - 1}
              listLayout={listLayout}
              onOpen={() => router.push(item.route)}
              onTogglePin={() => onTogglePin(item.key)}
              onReorderUp={() => reorderPin(item.key, 'up')}
              onReorderDown={() => reorderPin(item.key, 'down')}
            />
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 6, paddingBottom: 24 },
  columnWrap: { justifyContent: 'flex-start' },
  subtitle: { fontSize: 14, marginHorizontal: 12, marginBottom: 8, lineHeight: 20 },
  fullHint: {
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
});
