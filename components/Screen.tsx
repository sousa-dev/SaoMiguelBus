import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppTheme } from '@/lib/theme';

type ScreenProps = {
  children: ReactNode;
  /** Stack/native header is visible — top inset comes from the header, not SafeAreaView. */
  withStackHeader?: boolean;
  /** Keep wrapper in native view hierarchy (required for modal/formSheet scroll). */
  collapsable?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
};

/**
 * Standard screen shell. Use `withStackHeader` when the screen sits under an
 * Expo Router Stack header so content is not double-padded at the top.
 */
export function Screen({
  children,
  withStackHeader = false,
  collapsable = false,
  edges,
  style,
}: ScreenProps) {
  const theme = useAppTheme();
  const resolvedEdges: Edge[] = edges ?? (withStackHeader ? ['bottom'] : ['top', 'bottom']);

  // Plain View keeps scroll views as the effective content root so iOS can inset for
  // the stack header (large title). SafeAreaView here breaks that adjustment chain.
  if (withStackHeader) {
    return (
      <View
        collapsable={collapsable}
        style={[{ flex: 1, backgroundColor: theme.background }, style]}
      >
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView
      collapsable={collapsable}
      style={[{ flex: 1, backgroundColor: theme.background }, style]}
      edges={resolvedEdges}
    >
      {children}
    </SafeAreaView>
  );
}
