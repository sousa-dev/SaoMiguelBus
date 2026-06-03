import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/StateView';
import { HubEditControls } from '@/features/hub/components/HubEditControls';
import { HubHero } from '@/features/hub/components/HubHero';
import { HubModuleTile } from '@/features/hub/components/HubModuleTile';
import { HubSeismicPreview } from '@/features/hub/components/previews/HubSeismicPreview';
import { HubTrafficPreview } from '@/features/hub/components/previews/HubTrafficPreview';
import { HubSkeletonTiles } from '@/features/hub/components/HubSkeletonTiles';
import { useHubPreviews } from '@/features/hub/hooks/useHubPreviews';
import { resolveEnabledModules, type ModuleKey } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useHubStore } from '@/lib/hub-store';
import { getEnabledHubModules } from '@/lib/modules';
import { useScrollContentPadding, useStackScrollProps } from '@/lib/stack-scroll';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { staticIslandConfig } from '@/config/island';

export default function HubScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const stackScrollProps = useStackScrollProps();
  const listBottomPadding = useScrollContentPadding(space['2xl']);
  const { data: bootstrap, isLoading: bootstrapLoading } = useBootstrap();
  const islandName = bootstrap?.island?.name ?? staticIslandConfig.islandName;
  const logoUri = (bootstrap?.island as { logoUrl?: string } | undefined)?.logoUrl ?? null;
  const enabledKeys = resolveEnabledModules(bootstrap?.island?.enabledModules);

  const editMode = useHubStore((s) => s.editMode);
  const layout = useHubStore((s) => s.layout);
  const columns = useHubStore((s) => s.columns);
  const pinnedKeys = useHubStore((s) => s.pinnedKeys);
  const moduleOrderKeys = useHubStore((s) => s.moduleOrderKeys);
  const isPinned = useHubStore((s) => s.isPinned);
  const canPinMore = useHubStore((s) => s.canPinMore);
  const togglePin = useHubStore((s) => s.togglePin);
  const reorderPin = useHubStore((s) => s.reorderPin);
  const reorderModule = useHubStore((s) => s.reorderModule);

  const modules = useMemo(
    () => getEnabledHubModules(enabledKeys, moduleOrderKeys),
    [enabledKeys, moduleOrderKeys],
  );

  const { seismicEvents, trafficReports } = useHubPreviews(enabledKeys);

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

  const moduleIndex = useCallback(
    (key: ModuleKey) => modules.findIndex((m) => m.key === key),
    [modules],
  );

  const listHeader = useMemo(() => {
    if (bootstrapLoading) {
      return <HubSkeletonTiles columns={columns} />;
    }
    return (
      <>
        {!editMode ? <HubHero islandName={islandName} logoUri={logoUri} /> : null}
        {editMode ? (
          <HubEditControls
            enabledKeys={enabledKeys}
            pinnedCount={pinnedKeys.length}
            showBarFull={barFull}
          />
        ) : null}
      </>
    );
  }, [bootstrapLoading, columns, editMode, islandName, logoUri, pinnedKeys.length, barFull]);

  const renderPreview = useCallback(
    (key: ModuleKey) => {
      if (key === 'seismic') {
        return <HubSeismicPreview events={seismicEvents} />;
      }
      if (key === 'traffic') {
        const hasActive = trafficReports.some((r) => r.status === 'active');
        if (!hasActive) {
          return null;
        }
        const mod = modules.find((m) => m.key === 'traffic');
        return (
          <HubTrafficPreview reports={trafficReports} accent={mod?.accent ?? theme.primary} />
        );
      }
      return null;
    },
    [modules, seismicEvents, trafficReports, theme.primary],
  );

  return (
    <FlatList
      key={`${layout}-${columns}`}
      style={[styles.fill, { backgroundColor: theme.background }]}
      {...stackScrollProps}
      data={bootstrapLoading ? [] : modules}
      keyExtractor={(item) => item.key}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
      contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
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
        const pinIdx = pinnedIndex(item.key);
        const gridIdx = moduleIndex(item.key);
        const preview = renderPreview(item.key);

        return (
          <HubModuleTile
            module={item}
            editMode={editMode}
            pinned={pinned}
            pinBlocked={!canPinMore()}
            showBarReorder={editMode && pinned}
            showGridReorder={editMode}
            canBarMoveUp={pinIdx > 0}
            canBarMoveDown={pinIdx >= 0 && pinIdx < pinnedKeys.length - 1}
            canGridMoveUp={gridIdx > 0}
            canGridMoveDown={gridIdx >= 0 && gridIdx < modules.length - 1}
            listLayout={listLayout}
            preview={preview}
            onOpen={() => router.push(item.route)}
            onTogglePin={() => onTogglePin(item.key)}
            onBarReorderUp={() => reorderPin(item.key, 'up')}
            onBarReorderDown={() => reorderPin(item.key, 'down')}
            onGridReorderUp={() => reorderModule(item.key, 'up', enabledKeys)}
            onGridReorderDown={() => reorderModule(item.key, 'down', enabledKeys)}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: space.md },
  columnWrap: { justifyContent: 'flex-start' },
});
