import { StyleSheet, View } from 'react-native';

import SaoMiguelOutline from '@/assets/images/hub/sao-miguel-outline.svg';
import { space } from '@/lib/tokens';

type Props = {
  color: string;
  opacity?: number;
};

/** São Miguel island outline only — stroke, no sea or archipelago fill. */
export function SaoMiguelSplashOutline({ color, opacity = 0.45 }: Props) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <SaoMiguelOutline width="100%" height="100%" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: space.lg,
    width: '72%',
    maxWidth: 280,
    aspectRatio: 2.3,
    alignSelf: 'center',
  },
});
