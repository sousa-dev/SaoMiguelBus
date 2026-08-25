import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type PulsingMarkerProps = {
  cx: number;
  cy: number;
  /** Core dot radius (SVG units). */
  r: number;
  color: string;
  /** 0..1 — higher values pulse faster and throw a wider halo. */
  intensity?: number;
  /** Disable animation (reduced motion) — renders a static dot. */
  animate?: boolean;
};

/** A red/accent SVG dot with an outward-pulsing halo whose tempo scales with `intensity`. */
export function PulsingMarker({
  cx,
  cy,
  r,
  color,
  intensity = 0.5,
  animate = true,
}: PulsingMarkerProps) {
  const clamped = Math.min(Math.max(intensity, 0), 1);
  const duration = 700 - clamped * 350; // more events -> faster pulse
  const haloMax = r * (2 + clamped * 1.5); // more events -> wider halo
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [animate, duration, progress]);

  const haloProps = useAnimatedProps(() => ({
    r: r + (haloMax - r) * progress.value,
    opacity: 0.4 * (1 - progress.value),
  }));

  return (
    <G>
      {animate ? (
        <AnimatedCircle cx={cx} cy={cy} r={r} fill={color} animatedProps={haloProps} />
      ) : null}
      <Circle cx={cx} cy={cy} r={r} fill={color} opacity={0.95} />
    </G>
  );
}
