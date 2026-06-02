import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { resolveEnabledModules } from '@/config/island';
import { HubModuleCard } from '@/features/hub/components/HubModuleCard';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { useHubStore } from '@/lib/hub-store';
import { modulesForEnabled } from '@/lib/modules';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import { staticIslandConfig } from '@/config/island';

export default function HubScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { data: bootstrap } = useBootstrap();
  const pinnedKeys = useHubStore((s) => s.pinnedKeys);
  const togglePin = useHubStore((s) => s.togglePin);

  const enabled = resolveEnabledModules(bootstrap?.island?.enabledModules);
  const modules = useMemo(() => modulesForEnabled(enabled), [enabled]);

  const pinned = modules.filter((m) => pinnedKeys.includes(m.key as typeof pinnedKeys[number]));
  const rest = modules.filter((m) => !pinnedKeys.includes(m.key as typeof pinnedKeys[number]));

  const islandName = bootstrap?.island?.name ?? staticIslandConfig.islandName;

  return (
    <Screen withStackHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.display, { color: theme.primary }]}>{islandName}</Text>
        <Text style={[typography.body, { color: theme.muted, marginBottom: space.lg }]}>{t('hubSubtitle')}</Text>

        {pinned.length > 0 ? (
          <>
            <Text style={[typography.overline, { color: theme.muted, marginBottom: space.sm }]}>{t('hubPinnedSection')}</Text>
            {pinned.map((mod) => (
              <HubModuleCard
                key={mod.key}
                module={mod}
                pinned
                onTogglePin={() => togglePin(mod.key as typeof pinnedKeys[number])}
              />
            ))}
          </>
        ) : null}

        {rest.length > 0 ? (
          <>
            <Text style={[typography.overline, { color: theme.muted, marginTop: space.lg, marginBottom: space.sm }]}>
              {t('hubAllModulesSection')}
            </Text>
            {rest.map((mod) => (
              <HubModuleCard
                key={mod.key}
                module={mod}
                pinned={false}
                onTogglePin={() => togglePin(mod.key as typeof pinnedKeys[number])}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['3xl'] },
});
