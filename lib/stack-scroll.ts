import { Platform, type ScrollViewProps } from 'react-native';

import { space } from '@/lib/tokens';

type StackScrollProps = Pick<
  ScrollViewProps,
  'contentInsetAdjustmentBehavior' | 'automaticallyAdjustsScrollIndicatorInsets'
>;

/** Props for ScrollView/FlatList under a native stack header (avoids content under the bar). */
export function useStackScrollProps(): StackScrollProps {
  if (Platform.OS !== 'ios') {
    return {};
  }
  return {
    contentInsetAdjustmentBehavior: 'automatic',
    automaticallyAdjustsScrollIndicatorInsets: true,
  };
}

/** Extra padding at the end of scrollable tab content (tab bar already reserves layout space). */
export function useScrollContentPadding(extra: number = space.lg): number {
  return extra;
}

/** @deprecated Tab bar is in layout flow; use {@link useScrollContentPadding} instead. */
export function useTabBarContentPadding(extra: number = space.lg): number {
  return useScrollContentPadding(extra);
}
