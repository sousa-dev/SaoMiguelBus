import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppTheme } from '@/lib/theme';

type ScreenProps = {
  children: ReactNode;
  /** Stack/native header is visible — top inset comes from the header, not SafeAreaView. */
  withStackHeader?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
};

/**
 * Standard screen shell. Use `withStackHeader` when the screen sits under an
 * Expo Router Stack header so content is not double-padded at the top.
 */
export function Screen({ children, withStackHeader = false, edges, style }: ScreenProps) {
  const theme = useAppTheme();
  const resolvedEdges: Edge[] = edges ?? (withStackHeader ? ['bottom'] : ['top', 'bottom']);

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: theme.background }, style]}
      edges={resolvedEdges}
    >
      {children}
    </SafeAreaView>
  );
}
