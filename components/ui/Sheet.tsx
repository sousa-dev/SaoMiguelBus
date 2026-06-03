import { BlurView } from 'expo-blur';
import React, { type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, sheet, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  scrollable?: boolean;
};

export function Sheet({ visible, onClose, title, children, scrollable = true }: SheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxHeight = height * sheet.maxHeightRatio;

  const body = scrollable ? (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ paddingBottom: insets.bottom + space.lg }}>{children}</View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.panel, { maxHeight, backgroundColor: theme.surface }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.outline }]} />
        </View>
        {title ? (
          <Text style={[typography.headline, { color: theme.text, paddingHorizontal: space.lg, marginBottom: space.md }]}>
            {title}
          </Text>
        ) : null}
        {body}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    paddingTop: space.sm,
  },
  handleWrap: { alignItems: 'center', paddingVertical: space.sm },
  handle: { width: sheet.handleWidth, height: sheet.handleHeight, borderRadius: radius.full },
});
