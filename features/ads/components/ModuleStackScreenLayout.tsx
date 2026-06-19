import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';

type Props = {
  children: ReactNode;
};

/** Wraps module stack screens with a top banner below the native header. */
export function ModuleStackScreenLayout({ children }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <ScreenTopAdBanner />
      {children}
    </View>
  );
}
