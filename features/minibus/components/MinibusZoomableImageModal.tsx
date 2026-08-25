import { X } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { radius, space } from '@/lib/tokens';

const BACKDROP_COLOR = 'rgba(0, 0, 0, 0.88)';
const CLOSE_BUTTON_BG = 'rgba(255, 255, 255, 0.18)';

type Props = {
  visible: boolean;
  uri: string;
  aspectRatio: number;
  accessibilityLabel: string;
  onClose: () => void;
};

function fitImageSize(
  intrinsicWidth: number,
  intrinsicHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (intrinsicWidth <= 0 || intrinsicHeight <= 0) {
    return { width: maxWidth, height: maxHeight * 0.6 };
  }

  const ratio = intrinsicWidth / intrinsicHeight;
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width, height };
}

export function MinibusZoomableImageModal({
  visible,
  uri,
  aspectRatio,
  accessibilityLabel,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const maxImageWidth = windowWidth - space.lg * 2;
  const maxImageHeight = windowHeight - insets.top - insets.bottom - space.xl * 2;

  const imageSize = useMemo(() => {
    const safeRatio = aspectRatio > 0 ? aspectRatio : 0.7;
    return fitImageSize(safeRatio * 1000, 1000, maxImageWidth, maxImageHeight);
  }, [aspectRatio, maxImageHeight, maxImageWidth]);

  if (!visible) {
    return null;
  }

  const image = (
    <Image
      accessibilityLabel={accessibilityLabel}
      source={{ uri }}
      resizeMode="contain"
      style={{ width: imageSize.width, height: imageSize.height }}
    />
  );

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: BACKDROP_COLOR }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          onPress={onClose}
        />

        <View
          pointerEvents="box-none"
          style={[styles.closeWrap, { top: insets.top + space.sm, right: space.md }]}
        >
          <IconButton
            icon={X}
            variant="ghost"
            size="md"
            color="#FFFFFF"
            accessibilityLabel={t('close')}
            onPress={onClose}
            style={styles.closeButton}
          />
        </View>

        {Platform.OS === 'ios' ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.centerStage}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bouncesZoom
          >
            {image}
          </ScrollView>
        ) : (
          <View pointerEvents="box-none" style={styles.centerStageFill}>
            {image}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  closeWrap: {
    position: 'absolute',
    zIndex: 2,
  },
  closeButton: {
    backgroundColor: CLOSE_BUTTON_BG,
    borderRadius: radius.full,
  },
  centerStage: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStageFill: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
