import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AdBanner } from '@/features/ads/components/AdBanner';
import { space } from '@/lib/tokens';

type Props = {
  /** Override pathname-derived slot when needed. */
  slot?: string;
  /** Use inside scroll views that already apply horizontal padding. */
  embedded?: boolean;
};

function slotFromPathname(pathname: string): string {
  const normalized = pathname.replace(/^\/+/, '').replace(/\//g, '-');
  return normalized ? `screen-${normalized}` : 'screen-root';
}

export function ScreenTopAdBanner({ slot, embedded }: Props) {
  const pathname = usePathname();
  const resolvedSlot = slot ?? slotFromPathname(pathname);

  return (
    <View style={embedded ? styles.embedded : styles.wrap}>
      <AdBanner on="home" slot={resolvedSlot} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    marginBottom: space.md,
  },
  embedded: {
    marginBottom: space.md,
  },
});
