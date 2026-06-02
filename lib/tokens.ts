import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Spacing scale (dp/pt). */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const hitSlop = {
  minTouch: Platform.select({ ios: 44, android: 48, default: 44 }) as number,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '700', lineHeight: 34 } satisfies TextStyle,
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 } satisfies TextStyle,
  headline: { fontSize: 18, fontWeight: '700', lineHeight: 24 } satisfies TextStyle,
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 } satisfies TextStyle,
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 22 } satisfies TextStyle,
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 } satisfies TextStyle,
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 } satisfies TextStyle,
  overline: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;

type ElevationLevel = 0 | 1 | 2 | 3;

export function elevation(level: ElevationLevel, shadowColor: string): ViewStyle {
  if (level === 0) {
    return {};
  }
  if (Platform.OS === 'android') {
    return { elevation: level === 1 ? 2 : level === 2 ? 4 : 8 };
  }
  const opacity = level === 1 ? 0.08 : level === 2 ? 0.12 : 0.18;
  const height = level === 1 ? 2 : level === 2 ? 4 : 8;
  const radiusBlur = level === 1 ? 4 : level === 2 ? 8 : 16;
  return {
    shadowColor,
    shadowOpacity: opacity,
    shadowOffset: { width: 0, height },
    shadowRadius: radiusBlur,
  };
}

export const sheet = {
  maxHeightRatio: 0.92,
  handleWidth: 36,
  handleHeight: 4,
} as const;
