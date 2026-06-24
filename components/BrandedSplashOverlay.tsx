import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Appearance,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AzoresMapBackground } from '@/features/hub/components/previews/AzoresMapBackground';
import { resolveSplashTheme, type SplashColorScheme } from '@/features/splash/branded-splash-theme';
import { space, typography } from '@/lib/tokens';

const APP_NAME = 'São Miguel Hub';
const FADE_MS = 250;
const LOGO_SIZE = 120;

function normalizeSplashColorScheme(
  scheme: ReturnType<typeof Appearance.getColorScheme>,
): SplashColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

type Props = {
  visible: boolean;
  devPreview?: boolean;
  onLayout?: () => void;
  onFadeOutComplete?: () => void;
  onDevPreviewDismiss?: () => void;
};

export function BrandedSplashOverlay({
  visible,
  devPreview = false,
  onLayout,
  onFadeOutComplete,
  onDevPreviewDismiss,
}: Props) {
  const { t } = useTranslation();
  const [colorScheme, setColorScheme] = useState<SplashColorScheme>(() =>
    normalizeSplashColorScheme(Appearance.getColorScheme()),
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const opacity = useSharedValue(visible ? 1 : 0);

  const theme = useMemo(() => resolveSplashTheme(colorScheme), [colorScheme]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const reduceMotionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const appearanceSub = Appearance.addChangeListener(({ colorScheme: nextScheme }) => {
      setColorScheme(normalizeSplashColorScheme(nextScheme));
    });

    return () => {
      reduceMotionSub.remove();
      appearanceSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.value = 1;
      return;
    }

    if (reduceMotion) {
      opacity.value = 0;
      setMounted(false);
      onFadeOutComplete?.();
      return;
    }

    opacity.value = withTiming(0, { duration: FADE_MS }, (finished) => {
      if (!finished) {
        return;
      }
      runOnJS(setMounted)(false);
      if (onFadeOutComplete) {
        runOnJS(onFadeOutComplete)();
      }
    });
  }, [visible, reduceMotion, onFadeOutComplete, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    if (event.nativeEvent.layout.width > 0 && event.nativeEvent.layout.height > 0) {
      onLayout?.();
    }
  };

  if (Platform.OS === 'web' || (!mounted && !visible)) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.root, { backgroundColor: theme.background }, animatedStyle]}
      onLayout={handleLayout}
    >
      <View pointerEvents="none" style={[styles.mapWatermark, { opacity: theme.mapOpacity }]}>
        <AzoresMapBackground />
      </View>

      <View style={styles.content}>
        <Image
          accessibilityIgnoresInvertColors
          source={require('../assets/images/splash-icon.png')}
          style={styles.logo}
        />
        <Text style={[typography.title, styles.appName, { color: theme.text }]}>{APP_NAME}</Text>
        <Text style={[typography.body, styles.tagline, { color: theme.textMuted }]}>
          {t('splashTagline')}
        </Text>
      </View>

      <ActivityIndicator
        accessibilityLabel={t('splashLoading')}
        color={theme.indicator}
        style={styles.loader}
      />

      {devPreview ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsShowSplashDismiss')}
            onPress={onDevPreviewDismiss}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[typography.caption, styles.devHint, { color: theme.textMuted }]}>
            {t('settingsShowSplashDismissHint')}
          </Text>
        </>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  mapWatermark: {
    ...StyleSheet.absoluteFill,
    top: '35%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: space.lg,
  },
  appName: {
    textAlign: 'center',
    marginBottom: space.sm,
  },
  tagline: {
    textAlign: 'center',
  },
  loader: {
    marginBottom: space['4xl'],
  },
  devHint: {
    position: 'absolute',
    bottom: space['2xl'],
    alignSelf: 'center',
    textAlign: 'center',
  },
});
