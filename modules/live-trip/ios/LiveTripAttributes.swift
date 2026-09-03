import ActivityKit
import Foundation

/// The canonical Live Activity contract for a tracked trip.
///
/// This file must compile into BOTH the app target (`LiveTripModule.swift`
/// calls `Activity<LiveTripAttributes>.request`) and the widget extension
/// target (`LiveTripWidget.swift` renders `ActivityConfiguration(for:
/// LiveTripAttributes.self)`). It is symlinked from `targets/live-trip-widget/`
/// rather than duplicated, because two copies that drift make the
/// `ContentState` decode fail silently at push time -- a bug that only shows
/// up on a physical device receiving a real APNs push.
///
/// Field names mirror `LiveTripSnapshot` in
/// `features/transit/lib/live-trip-state.ts` and the Python payload builder
/// in `azoresbus/apns.py`. Keep all three in step by hand -- there is no
/// shared codegen across TypeScript, Swift and Python here.
public struct LiveTripAttributes: ActivityAttributes {
  /// What never changes for the life of one activity. Stored directly on the
  /// attributes struct, per `ActivityAttributes` -- there is no separate
  /// "static" nested type in ActivityKit's own shape.
  public let activityKey: String
  public let deepLink: String
  /// Present here (not only inside `ContentState`) so the widget can render a
  /// title even the instant the shared strings suite is unreadable -- see
  /// `LiveTripSharedStore` and `LiveTripFallbackStrings`.
  public let route: String
  public let destination: String

  public init(activityKey: String, deepLink: String, route: String, destination: String) {
    self.activityKey = activityKey
    self.deepLink = deepLink
    self.route = route
    self.destination = destination
  }

  /// Mirrors `LiveTripSnapshot`. Schema-versioned because this struct ships
  /// inside the widget's compiled binary while `ContentState` values arrive
  /// live over APNs -- an older binary must not crash decoding a payload from
  /// a newer server; decode failures should fall back to the previous state,
  /// never crash the extension process.
  public struct ContentState: Codable, Hashable {
    public let schemaVersion: Int
    public let state: String // "waiting" | "riding" | "arriving" | "completed" | "stale"
    public let nextStopName: String?
    public let minutesToNextStop: Int?
    public let delayMinutes: Int?
    public let progress: Double
    public let updatedAtEpochMs: Double

    public init(
      schemaVersion: Int = 1,
      state: String,
      nextStopName: String?,
      minutesToNextStop: Int?,
      delayMinutes: Int?,
      progress: Double,
      updatedAtEpochMs: Double
    ) {
      self.schemaVersion = schemaVersion
      self.state = state
      self.nextStopName = nextStopName
      self.minutesToNextStop = minutesToNextStop
      self.delayMinutes = delayMinutes
      self.progress = progress
      self.updatedAtEpochMs = updatedAtEpochMs
    }
  }
}
