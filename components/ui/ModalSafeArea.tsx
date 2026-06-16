import React, { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Modal content on iOS renders outside the root SafeAreaProvider tree.
 * Wrap fullscreen modal bodies with this so top/bottom insets apply correctly.
 */
export function ModalSafeArea({ children, style }: Props) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView edges={['top', 'bottom']} style={[{ flex: 1 }, style]}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
