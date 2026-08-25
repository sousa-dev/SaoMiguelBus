import { usePathname, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { MessageSquarePlus, X, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FabAction } from '@/components/ui/FabAction';
import {
  getModuleIcon,
  getScreenLabelKey,
  getStaticActions,
  isFabHidden,
  type FabAction as FabActionType,
} from '@/lib/fab-registry';
import { useFabStore } from '@/lib/fab-store';
import { elevation, hitSlop, iconSize, radius, space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/** Tab bar content height (excludes the safe-area bottom inset it adds on top). */
const TAB_BAR_BASE = Platform.OS === 'ios' ? 49 : 56;

/**
 * App-wide, route-aware speed-dial FAB. Mounted once at the root. Renders the
 * current route's static actions + any runtime actions the focused screen
 * registered + a permanent "Send feedback" action (always last).
 */
export function GlobalFab() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const runtimeActions = useFabStore((s) => s.runtimeActions);
  const runtimeClosedIcon = useFabStore((s) => s.runtimeClosedIcon);

  const [open, setOpen] = useState(false);

  // Collapse whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const screenLabel = useMemo(() => {
    const key = getScreenLabelKey(pathname);
    return key ? t(key) : pathname;
  }, [pathname, t]);

  const feedbackAction = useMemo<FabActionType>(
    () => ({
      key: 'feedback',
      labelKey: 'fabSendFeedback',
      icon: MessageSquarePlus,
      onPress: () =>
        router.push({
          pathname: '/feedback',
          params: { from: pathname, label: screenLabel },
        } as Href),
    }),
    [router, pathname, screenLabel],
  );

  const actions = useMemo<FabActionType[]>(
    () => [...getStaticActions(pathname), ...runtimeActions, feedbackAction],
    [pathname, runtimeActions, feedbackAction],
  );

  const closedFabIcon = useMemo(() => {
    if (runtimeClosedIcon) {
      return runtimeClosedIcon;
    }
    const primary = actions.find((a) => a.key !== 'feedback');
    return primary?.icon ?? getModuleIcon(pathname) ?? Zap;
  }, [actions, pathname, runtimeClosedIcon]);

  if (isFabHidden(pathname)) {
    return null;
  }

  const runAction = (action: FabActionType) => {
    setOpen(false);
    if (action.href) {
      router.push(action.href);
      return;
    }
    action.onPress?.();
  };

  const bottom = insets.bottom + TAB_BAR_BASE + space.lg;
  const FabIcon = open ? X : closedFabIcon;

  return (
    <>
      {open ? (
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.scrim }]}
          accessibilityLabel={t('fabClose')}
          onPress={() => setOpen(false)}
        />
      ) : null}

      <View style={[styles.container, { bottom, right: space.xl }]} pointerEvents="box-none">
        {open ? (
          <View style={styles.actions}>
            {actions.map((action) => (
              <FabAction
                key={action.key}
                icon={action.icon}
                label={t(action.labelKey)}
                onPress={() => runAction(action)}
              />
            ))}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? t('fabClose') : t('fabOpen')}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          android_ripple={Platform.OS === 'android' ? { color: theme.onPrimary } : undefined}
          style={({ pressed }) => [
            styles.fab,
            elevation(3, theme.text),
            { backgroundColor: theme.primary, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View pointerEvents="none" style={styles.fabIconSlot}>
            <FabIcon size={iconSize.lg} color={theme.onPrimary} strokeWidth={2.5} />
          </View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  container: { position: 'absolute', alignItems: 'flex-end' },
  actions: { alignItems: 'flex-end', marginBottom: space.md },
  fab: {
    width: hitSlop.minTouch,
    height: hitSlop.minTouch,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  fabIconSlot: {
    width: iconSize.lg,
    height: iconSize.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
