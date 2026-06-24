import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
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

import { IconButton } from '@/components/ui/IconButton';
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.scrim, { backgroundColor: theme.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.panel, { maxHeight, backgroundColor: theme.surface }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.outline }]} />
          </View>
          {title ? (
            <View style={styles.titleRow}>
              <Text style={[typography.headline, styles.titleText, { color: theme.text }]}>{title}</Text>
              <IconButton icon={X} accessibilityLabel="Close" onPress={onClose} />
            </View>
          ) : null}
          {body}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: { ...StyleSheet.absoluteFillObject },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    paddingTop: space.sm,
  },
  handleWrap: { alignItems: 'center', paddingVertical: space.sm },
  handle: { width: sheet.handleWidth, height: sheet.handleHeight, borderRadius: radius.full },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginBottom: space.md,
    gap: space.sm,
  },
  titleText: {
    flex: 1,
  },
});
