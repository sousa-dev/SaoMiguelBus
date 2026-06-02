import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ModuleKey } from '@/config/island';
import { orderedTabScreenNames } from '@/lib/hub-tab-screens';
import { elevation, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type TabRoute = {
  key: string;
  name: string;
  params?: object;
};

type TabDescriptor = {
  options: {
    title?: string;
    tabBarLabel?: string;
    tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
  };
};

/** Props from Expo Router Tabs `tabBar` callback plus hub ordering. */
export type HubTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, TabDescriptor>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
  pinnedKeys: ModuleKey[];
  enabledKeys: ModuleKey[];
};

export function HubTabBar({ state, descriptors, navigation, pinnedKeys, enabledKeys }: HubTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const order = orderedTabScreenNames(pinnedKeys, enabledKeys);

  const activeRoute = state.routes[state.index];
  const activeName = activeRoute?.name;

  const useSolidBar = Platform.OS === 'android' || theme.isDark;

  const tabBarStyle = useSolidBar
    ? {
        backgroundColor: theme.surface,
        borderTopColor: theme.divider,
        ...(Platform.OS === 'android' ? elevation(1, theme.text) : {}),
      }
    : { backgroundColor: 'transparent', borderTopColor: theme.divider };

  return (
    <View style={[styles.wrap, tabBarStyle, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {Platform.OS === 'ios' && !theme.isDark ? (
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={styles.row}>
        {order.map((screenName) => {
          const route = state.routes.find((r: TabRoute) => r.name === screenName);
          if (!route) {
            return null;
          }
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? screenName;
          const isFocused = activeName === screenName;
          const color = isFocused ? theme.primary : theme.onSurfaceMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color,
            size: 24,
          });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={typeof label === 'string' ? label : screenName}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              {icon}
              <Text
                style={[
                  typography.caption,
                  styles.label,
                  { color },
                  isFocused && styles.labelFocused,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 2,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  labelFocused: {
    fontWeight: '600',
  },
});
