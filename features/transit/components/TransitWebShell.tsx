import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/lib/tokens';

const MAX_WIDTH = 448;

type Props = {
  children: ReactNode;
};

/** Centers transit content like the webapp `max-w-md` column. */
export function TransitWebShell({ children }: Props) {
  return <View style={styles.shell}>{children}</View>;
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    gap: space.md,
  },
});
