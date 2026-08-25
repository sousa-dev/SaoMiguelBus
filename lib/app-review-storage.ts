import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ATTEMPT_AT_KEY = 'app_review_last_attempt_at';
const ATTEMPT_COUNT_KEY = 'app_review_attempt_count';
const SEEN_TRIGGERS_KEY = 'app_review_seen_triggers';
const REVIEW_COMPLETED_AT_KEY = 'app_review_completed_at';
const TRANSIT_SUCCESS_SEARCH_COUNT_KEY = 'transit_successful_search_count';

export type AppReviewStorageState = {
  lastAttemptAt: string | null;
  attemptCount: number;
  seenTriggers: string[];
  /** Set when the user confirms they enjoy the app and we open native review or the store listing. */
  reviewCompletedAt: string | null;
  transitSuccessfulSearchCount: number;
};

export async function loadAppReviewStorage(): Promise<AppReviewStorageState> {
  const [lastAttemptAt, attemptCountRaw, seenTriggersRaw, reviewCompletedAt, transitCountRaw] =
    await Promise.all([
      AsyncStorage.getItem(LAST_ATTEMPT_AT_KEY),
      AsyncStorage.getItem(ATTEMPT_COUNT_KEY),
      AsyncStorage.getItem(SEEN_TRIGGERS_KEY),
      AsyncStorage.getItem(REVIEW_COMPLETED_AT_KEY),
      AsyncStorage.getItem(TRANSIT_SUCCESS_SEARCH_COUNT_KEY),
    ]);

  let seenTriggers: string[] = [];
  if (seenTriggersRaw) {
    try {
      const parsed = JSON.parse(seenTriggersRaw) as unknown;
      if (Array.isArray(parsed)) {
        seenTriggers = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      seenTriggers = [];
    }
  }

  const attemptCount = attemptCountRaw ? Number(attemptCountRaw) : 0;
  const transitSuccessfulSearchCount = transitCountRaw ? Number(transitCountRaw) : 0;

  return {
    lastAttemptAt,
    attemptCount: Number.isFinite(attemptCount) ? attemptCount : 0,
    seenTriggers,
    reviewCompletedAt,
    transitSuccessfulSearchCount: Number.isFinite(transitSuccessfulSearchCount)
      ? transitSuccessfulSearchCount
      : 0,
  };
}

export async function recordAppReviewAttempt(
  trigger: string,
  attemptedAt: string,
  previous: AppReviewStorageState,
): Promise<AppReviewStorageState> {
  const seenTriggers = previous.seenTriggers.includes(trigger)
    ? previous.seenTriggers
    : [...previous.seenTriggers, trigger];
  const reviewCompletedAt = previous.reviewCompletedAt ?? attemptedAt;
  const next: AppReviewStorageState = {
    lastAttemptAt: attemptedAt,
    attemptCount: previous.attemptCount + 1,
    seenTriggers,
    reviewCompletedAt,
    transitSuccessfulSearchCount: previous.transitSuccessfulSearchCount,
  };

  await Promise.all([
    AsyncStorage.setItem(LAST_ATTEMPT_AT_KEY, next.lastAttemptAt),
    AsyncStorage.setItem(ATTEMPT_COUNT_KEY, String(next.attemptCount)),
    AsyncStorage.setItem(SEEN_TRIGGERS_KEY, JSON.stringify(next.seenTriggers)),
    AsyncStorage.setItem(REVIEW_COMPLETED_AT_KEY, reviewCompletedAt),
  ]);

  return next;
}

export async function incrementTransitSuccessfulSearchCount(
  previous: AppReviewStorageState,
): Promise<AppReviewStorageState> {
  const nextCount = previous.transitSuccessfulSearchCount + 1;
  await AsyncStorage.setItem(TRANSIT_SUCCESS_SEARCH_COUNT_KEY, String(nextCount));
  return {
    ...previous,
    transitSuccessfulSearchCount: nextCount,
  };
}

export async function recordAppReviewDeclined(
  trigger: string,
  previous: AppReviewStorageState,
): Promise<AppReviewStorageState> {
  if (previous.seenTriggers.includes(trigger)) {
    return previous;
  }

  const next: AppReviewStorageState = {
    ...previous,
    seenTriggers: [...previous.seenTriggers, trigger],
  };

  await AsyncStorage.setItem(SEEN_TRIGGERS_KEY, JSON.stringify(next.seenTriggers));
  return next;
}

export async function clearAppReviewStorageForTests(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(LAST_ATTEMPT_AT_KEY),
    AsyncStorage.removeItem(ATTEMPT_COUNT_KEY),
    AsyncStorage.removeItem(SEEN_TRIGGERS_KEY),
    AsyncStorage.removeItem(REVIEW_COMPLETED_AT_KEY),
    AsyncStorage.removeItem(TRANSIT_SUCCESS_SEARCH_COUNT_KEY),
  ]);
}
