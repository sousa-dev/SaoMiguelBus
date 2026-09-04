import { Bus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Skeleton } from '@/components/ui/Skeleton';
import { formatAppDate } from '@/lib/date-format';
import { elevation, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/** How long each reassurance message stays on screen. */
const MESSAGE_INTERVAL_MS = 1600;
const TRACK_WIDTH = 220;
const BUS_SIZE = 20;

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Two local calendar dates compared at day granularity — the planner's `date` is
 * a local Date set by the date picker, never an instant in another timezone.
 */
function isNextLocalDay(target: Date, ref: Date): boolean {
  const tomorrow = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1);
  return isSameLocalDay(target, tomorrow);
}

/**
 * The "today" copy is wrong whenever a rider searched for tomorrow or a later
 * date. Fall back to a {{date}}-interpolated message for any day that is not
 * today or tomorrow — keeps the rotating reassurance accurate.
 */
function timetablesMessage(date?: Date): {
  key: string;
  defaultValue: string;
  params?: Record<string, string>;
} {
  if (!date) {
    return { key: 'searchingTimetables', defaultValue: "Checking today's timetables…" };
  }
  const now = new Date();
  if (isSameLocalDay(date, now)) {
    return { key: 'searchingTimetables', defaultValue: "Checking today's timetables…" };
  }
  if (isNextLocalDay(date, now)) {
    return { key: 'searchingTimetablesTomorrow', defaultValue: "Checking tomorrow's timetables…" };
  }
  return {
    key: 'searchingTimetablesDate',
    defaultValue: 'Checking timetables for {{date}}…',
    params: { date: formatAppDate(date) },
  };
}

const JOURNEY_MESSAGES = [
  ['searchingBuses', 'Searching buses…'],
  ['searchingTimetables', "Checking today's timetables…"],
  ['searchingConnections', 'Looking for connections…'],
  ['searchingSorting', 'Sorting by departure time…'],
] as const;

const DIRECTIONS_MESSAGES = [
  ['searchingDirections', 'Plotting your route…'],
  ['searchingWalking', 'Measuring the walking legs…'],
  ['searchingDeparture', 'Matching the next departures…'],
  ['searchingSteps', 'Putting the steps in order…'],
] as const;

type Variant = 'journeys' | 'directions';

/** The bus actually travels the line between the two stops. */
function BusTrack({ color, trackColor }: { color: string; trackColor: string }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(progress);
      cancelAnimation(pulse);
      progress.value = 0.5;
      pulse.value = 0;
      return;
    }
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => {
      cancelAnimation(progress);
      cancelAnimation(pulse);
    };
  }, [reducedMotion, progress, pulse]);

  const busStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_WIDTH - BUS_SIZE) }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 1 - pulse.value * 0.45,
  }));

  return (
    <View style={styles.trackRow}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
      <View style={[styles.track, { width: TRACK_WIDTH, borderColor: trackColor }]}>
        <Animated.View style={[styles.busWrap, busStyle]}>
          <Bus size={BUS_SIZE} color={color} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
    </View>
  );
}

function RotatingMessage({
  variant,
  color,
  date,
}: {
  variant: Variant;
  color: string;
  date?: Date;
}) {
  const { t } = useTranslation();
  const messages = variant === 'directions' ? DIRECTIONS_MESSAGES : JOURNEY_MESSAGES;
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const id = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 250 }),
      );
      setIndex((i) => (i + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [messages, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const [baseKey, baseDefaultValue] = messages[index];

  // Only the timetables line claims "today"; swap it for a date-aware variant
  // so the message tracks what the rider actually searched for.
  let key: string = baseKey;
  let defaultValue: string = baseDefaultValue;
  let params: Record<string, string> | undefined;
  if (baseKey === 'searchingTimetables') {
    const m = timetablesMessage(date);
    key = m.key;
    defaultValue = m.defaultValue;
    params = m.params;
  }

  const options = params ? { defaultValue, ...params } : { defaultValue };

  return (
    <Animated.Text
      accessibilityLiveRegion="polite"
      style={[typography.label, { color, marginTop: space.sm, textAlign: 'center' }, style]}
    >
      {t(key, options)}
    </Animated.Text>
  );
}

function JourneySkeletonCard() {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, elevation(2, theme.text)]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bus size={22} color={theme.border} />
          <Skeleton width={44} height={20} />
        </View>
        <Skeleton width={48} height={14} />
      </View>
      <View style={styles.timelineRow}>
        <View style={{ gap: space.xs }}>
          <Skeleton width={48} height={18} />
          <Skeleton width={70} height={12} />
        </View>
        <View style={styles.timelineLine}>
          <View style={[styles.timelineDash, { backgroundColor: theme.border }]} />
        </View>
        <View style={{ gap: space.xs, alignItems: 'flex-end' }}>
          <Skeleton width={48} height={18} />
          <Skeleton width={70} height={12} />
        </View>
      </View>
      <Skeleton width="40%" height={12} style={{ marginTop: space.md, alignSelf: 'center' }} />
    </View>
  );
}

function DirectionsSkeletonCard() {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, elevation(2, theme.text)]}>
      <View style={styles.header}>
        <Skeleton width={90} height={16} />
        <Skeleton width={70} height={16} />
      </View>
      <Skeleton height={140} rounded="lg" style={{ marginTop: space.sm }} />
      <View style={{ marginTop: space.md, gap: space.md }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.stepRow}>
            <Skeleton width={20} height={20} rounded="full" />
            <View style={{ flex: 1, gap: space.xs }}>
              <Skeleton width={i % 2 === 0 ? '75%' : '50%'} height={13} />
              <Skeleton width={90} height={11} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The waiting state for a route search: an animated bus, a message that keeps
 * moving so a slow API still feels alive, and skeletons shaped like the cards
 * about to land — so results fill in instead of shoving the screen down.
 */
export function SearchingState({ variant = 'journeys', date }: { variant?: Variant; date?: Date }) {
  const theme = useAppTheme();
  const count = variant === 'directions' ? 2 : 3;

  return (
    <View style={styles.wrap}>
      <View style={styles.busSection}>
        <BusTrack color={theme.primary} trackColor={theme.border} />
        <RotatingMessage variant={variant} color={theme.muted} date={date} />
      </View>
      <View style={{ gap: space.md }}>
        {Array.from({ length: count }).map((_, i) =>
          variant === 'directions' ? <DirectionsSkeletonCard key={i} /> : <JourneySkeletonCard key={i} />,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, width: '100%' },
  busSection: { alignItems: 'center', paddingVertical: space.sm },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  track: { height: BUS_SIZE, borderBottomWidth: 1, borderStyle: 'dashed', justifyContent: 'center' },
  busWrap: { position: 'absolute', left: 0 },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineLine: { flex: 1, paddingHorizontal: space.md },
  timelineDash: { height: 1, width: '100%' },
  stepRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
