package expo.modules.livetrip

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/**
 * One leg's absolute-minute window, mirroring `LiveTripLegWindow` in
 * `features/transit/lib/live-trip-legs.ts`. Native never recomputes this from
 * the itinerary -- JS is the only side that owns `computeJourneyStatus`-style
 * logic, so it hands down the already-flattened windows once at start.
 */
class LiveTripLegWindowRecord : Record {
  @Field
  val tripId: Int = 0

  @Field
  val startMinutes: Int = 0

  @Field
  val endMinutes: Int = 0
}

/**
 * Already-localized `{placeholder}` templates. Mirrors `LiveTripStrings` in
 * `features/transit/lib/live-trip-state.ts` field for field -- keep the two in
 * sync by hand, there is no shared codegen between Kotlin and TypeScript here.
 */
class LiveTripStringsRecord : Record {
  @Field
  val locale: String = "pt"

  @Field
  val title: String = ""

  @Field
  val waiting: String = ""

  @Field
  val riding: String = ""

  @Field
  val arriving: String = ""

  @Field
  val late: String = ""

  @Field
  val onTime: String = ""

  @Field
  val stale: String = ""

  @Field
  val completed: String = ""
}

/** Mirrors `LiveTripSnapshot`. `Int?`/`Double?` fields are nullable on purpose. */
class LiveTripSnapshotRecord : Record {
  @Field
  val state: String = "waiting"

  @Field
  val nextStopName: String? = null

  @Field
  val minutesToNextStop: Int? = null

  @Field
  val delayMinutes: Int? = null

  @Field
  val progress: Double = 0.0

  @Field
  val updatedAtEpochMs: Double = 0.0
}

/**
 * Everything the service needs to run without JS: where to poll, what to say,
 * and when to stop on its own even if JS never calls `stop`.
 */
class LiveTripStartConfigRecord : Record {
  /** Equals `ActiveTrack.id`. */
  @Field
  val activityKey: String = ""

  @Field
  val apiBase: String = ""

  @Field
  val islandKey: String = ""

  /** Required so the poller's throttle bucket is per-session, not per-IP. */
  @Field
  val sessionId: String = ""

  @Field
  val legs: List<LiveTripLegWindowRecord> = emptyList()

  /** Epoch ms for the itinerary's departure-day midnight. */
  @Field
  val departureDayStartMs: Double = 0.0

  /** Hard stop -- the service self-terminates here even without a `stop()` call. */
  @Field
  val endsAtEpochMs: Double = 0.0

  @Field
  val deepLink: String = ""

  @Field
  val route: String = ""

  @Field
  val destination: String = ""

  /** The scheduled arrival wall-clock, e.g. "21h59" -- substituted into `waiting`. */
  @Field
  val eta: String = ""

  @Field
  val strings: LiveTripStringsRecord = LiveTripStringsRecord()

  @Field
  val intervalMs: Double = 60_000.0
}
