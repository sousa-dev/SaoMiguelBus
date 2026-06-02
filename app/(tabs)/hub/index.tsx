import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/ui/StateView';
import { HubEditControls } from '@/features/hub/components/HubEditControls';
import { HubHero } from '@/features/hub/components/HubHero';
import { HubModuleTile } from '@/features/hub/components/HubModuleTile';
import { HubSkeletonTiles } from '@/features/hub/components/HubSkeletonTiles';
import { resolveEnabledModules, type ModuleKey } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useHubStore } from '@/lib/hub-store';
import { getEnabledHubModules } from '@/lib/modules';
import { space } from '@/lib/tokens';
import { staticIslandConfig } from '@/config/island';

export default function HubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: bootstrap, isLoading: bootstrapLoading } = useBootstrap();
  const islandName = bootstrap?.island?.name ?? staticIslandConfig.islandName;
  const logoUri = (bootstrap?.island as { logoUrl?: string } | undefined)?.logoUrl ?? null;
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

  const [barFull, setBarFull] = useState(false);
  const listLayout = layout === 'list';
  const numColumns = listLayout ? 1 : columns;

  const onTogglePin = useCallback(
    (key: ModuleKey) => {
      const ok = togglePin(key);
      if (!ok) {
        setBarFull(true);
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        return;
      }
      setBarFull(false);
    },
    [togglePin],
  );

  const pinnedIndex = useCallback(
    (key: ModuleKey) => pinnedKeys.indexOf(key),
    [pinnedKeys],
  );

  const listHeader = useMemo(() => {
    if (bootstrapLoading) {
      return <HubSkeletonTiles columns={columns} />;
    }
    return (
      <>
        {!editMode ? <HubHero islandName={islandName} logoUri={logoUri} /> : null}
        {editMode ? (
          <HubEditControls pinnedCount={pinnedKeys.length} showBarFull={barFull} />
        ) : null}
      </>
    );
  }, [bootstrapLoading, columns, editMode, islandName, logoUri, pinnedKeys.length, barFull]);

  return (
    <Screen withStackHeader>
      <FlatList
        key={`${layout}-${columns}`}
        data={bootstrapLoading ? [] : modules}
        keyExtractor={(item) => item.key}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
        contentContainerStyle={styles.list}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          bootstrapLoading ? null : (
            <EmptyState
              icon={LayoutGrid}
              title={t('hubEmpty')}
              description={t('hubSubtitle')}
            />
          )
        }
        renderItem={({ item }) => {
          const pinned = isPinned(item.key);
          const idx = pinnedIndex(item.key);
          return (
            <HubModuleTile
              module={item}
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
  list: { paddingBottom: space['2xl'] },
  columnWrap: { justifyContent: 'flex-start' },
});
