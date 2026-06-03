import { usePathname, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { resolveEnabledModules } from '@/config/island';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { isSidebarItemActive } from '@/lib/sidebar-active';
import { useSidebarStore } from '@/lib/sidebar-store';
import { withAlpha } from '@/lib/color-utils';
import { SIDEBAR_SECTIONS, type SidebarNavItem } from '@/lib/modules';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { primaryTint, useAppTheme } from '@/lib/theme';

const PANEL_MAX_WIDTH = 360;
const ANIM_MS = 220;

function panelWidth(): number {
  return Math.min(Dimensions.get('window').width * 0.82, PANEL_MAX_WIDTH);
}

export function AppSidebar() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const open = useSidebarStore((s) => s.open);
  const closeSidebar = useSidebarStore((s) => s.closeSidebar);
  const { data: bootstrap } = useBootstrapCached();
  const enabledKeys = useMemo(
    () => resolveEnabledModules(bootstrap?.island?.enabledModules),
    [bootstrap?.island?.enabledModules],
  );
  const enabledSet = useMemo(() => new Set(enabledKeys), [enabledKeys]);

  const width = panelWidth();
  const [mounted, setMounted] = useState(open);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const unmountWhenClosed = useCallback(() => {
    setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  useEffect(() => {
    const duration = reduceMotion ? 0 : ANIM_MS;
    progress.value = withTiming(open ? 1 : 0, { duration }, (finished) => {
      if (finished && !open) {
        runOnJS(unmountWhenClosed)();
      }
    });
  }, [open, reduceMotion, progress, unmountWhenClosed]);

  useEffect(() => {
    if (!open || Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSidebar();
      return true;
    });
    return () => sub.remove();
  }, [open, closeSidebar]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * width }],
  }));

  const onNavigate = (item: SidebarNavItem) => {
    closeSidebar();
    router.push(item.route);
  };

  if (!mounted) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel={t('sidebarClose')}
        onPress={closeSidebar}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, scrimStyle]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.panel,
          panelStyle,
          elevation(3, theme.text),
          {
            width,
            backgroundColor: theme.surface,
            paddingTop: insets.top + space.md,
            paddingBottom: insets.bottom + space.md,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[typography.title, { color: theme.text, flex: 1 }]}>{t('sidebarTitle')}</Text>
          <IconButton
            icon={X}
            accessibilityLabel={t('sidebarClose')}
            color={theme.text}
            onPress={closeSidebar}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {SIDEBAR_SECTIONS.map((section) => (
            <View key={section.id} style={styles.section}>
              {section.titleKey ? (
                <Text style={[typography.overline, styles.sectionLabel, { color: theme.muted }]}>
                  {t(section.titleKey)}
                </Text>
              ) : null}
              {section.items.map((item) => {
                const active = isSidebarItemActive(pathname, item);
                const disabledHint =
                  item.moduleKey != null && !enabledSet.has(item.moduleKey);
                const accent = item.accent ?? theme.primary;
                const { Icon } = item;

                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(item.labelKey)}
                    onPress={() => onNavigate(item)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: active ? primaryTint(theme, 0.14) : 'transparent',
                        opacity: disabledHint ? 0.72 : pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconTile,
                        { backgroundColor: withAlpha(accent, 0.12) },
                      ]}
                    >
                      <Icon color={accent} size={22} strokeWidth={2} />
                    </View>
                    <Text
                      style={[
                        typography.bodyStrong,
                        styles.rowLabel,
                        { color: active ? theme.primary : theme.text },
                      ]}
                      numberOfLines={2}
                    >
                      {t(item.labelKey)}
                    </Text>
                    {disabledHint ? (
                      <View
                        style={[styles.offDot, { backgroundColor: theme.muted }]}
                        accessibilityElementsHidden
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: space.sm, paddingBottom: space.lg },
  section: { marginBottom: space.md },
  sectionLabel: { marginLeft: space.md, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    minHeight: 48,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1 },
  offDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
});
