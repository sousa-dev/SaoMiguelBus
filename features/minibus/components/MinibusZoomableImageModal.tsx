import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { radius, space } from '@/lib/tokens';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const BACKDROP_COLOR = 'rgba(0, 0, 0, 0.88)';
const CLOSE_BUTTON_BG = 'rgba(255, 255, 255, 0.18)';

type Props = {
  visible: boolean;
  uri: string;
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
      <Animated.View style={[styles.zoomFrame, { width, height }]}>
        <Animated.Image
          accessibilityLabel={accessibilityLabel}
          source={{ uri }}
          resizeMode="contain"
          style={[{ width, height }, animatedStyle]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export function MinibusZoomableImageModal({ visible, uri, accessibilityLabel, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [imageSize, setImageSize] = useState({ width: windowWidth, height: windowHeight * 0.6 });

  const maxImageWidth = windowWidth - space.lg * 2;
  const maxImageHeight = windowHeight - insets.top - insets.bottom - space.xl * 2;

  useEffect(() => {
    if (!uri) {
      return;
    }
    let active = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (!active) {
          return;
        }
        setImageSize(fitImageSize(width, height, maxImageWidth, maxImageHeight));
      },
      () => {
        if (active) {
          setImageSize(fitImageSize(0, 0, maxImageWidth, maxImageHeight));
        }
      },
    );
    return () => {
      active = false;
    };
  }, [uri, maxImageWidth, maxImageHeight]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.flex}>
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

          <View pointerEvents="box-none" style={styles.centerStage}>
            <ZoomableImage
              uri={uri}
              width={imageSize.width}
              height={imageSize.height}
              accessibilityLabel={accessibilityLabel}
            />
          </View>
        </View>
      </GestureHandlerRootView>
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  zoomFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
