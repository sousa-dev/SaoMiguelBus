import { X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { space } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

const MIN_SCALE = 1;
const MAX_SCALE = 5;

type Props = {
  visible: boolean;
  uri: string;
  accessibilityLabel: string;
  onClose: () => void;
};

function ZoomableImage({
  uri,
  width,
  height,
  accessibilityLabel,
}: {
  uri: string;
  width: number;
  height: number;
  accessibilityLabel: string;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [uri, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * event.scale));
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= MIN_SCALE) {
        return;
      }
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }
      scale.value = withTiming(2.5);
      savedScale.value = 2.5;
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.zoomStage, { width, height }]}>
        <Animated.Image
          accessibilityLabel={accessibilityLabel}
          source={{ uri }}
          resizeMode="contain"
          style={[styles.zoomImage, { width, height }, animatedStyle]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export function MinibusZoomableImageModal({ visible, uri, accessibilityLabel, onClose }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const stageWidth = width;
  const stageHeight = height - insets.top - insets.bottom - space.xl * 2;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.flex}>
        <View style={[styles.backdrop, { backgroundColor: theme.scrim, paddingTop: insets.top }]}>
          <View style={styles.header}>
            <IconButton
              icon={X}
              variant="ghost"
              size="md"
              color={theme.text}
              accessibilityLabel={t('close')}
              onPress={onClose}
            />
          </View>
          <ZoomableImage
            uri={uri}
            width={stageWidth}
            height={Math.max(stageHeight, 240)}
            accessibilityLabel={accessibilityLabel}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1 },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  zoomStage: { alignItems: 'center', justifyContent: 'center' },
  zoomImage: {},
});
