/**
 * Re-exported from `features/transit/lib/live-trip-state.ts` so anything
 * under `lib/live-trip/` is self-contained — the iOS bridge added in a later
 * task reaches for this the same way the Android one does, without having to
 * know the templates actually live in `features/transit`.
 */
export { liveTripStrings } from '@/features/transit/lib/live-trip-state';
export type { LiveTripStrings } from '@/features/transit/lib/live-trip-state';
