import Foundation

/// Reads and writes the App Group suite that carries `LiveTripStrings` from
/// the app to the widget extension.
///
/// This exists because `ContentState` (the part that arrives over APNs) is
/// budgeted at 4KB and is VALUES only -- no room for eight localized template
/// strings on every push, and no reason to pay that cost when they never
/// change mid-trip except on a language switch. The app writes them once at
/// `start()`; the widget reads them on every render.
///
/// Symlinked into `targets/live-trip-widget/` for the same reason
/// `LiveTripAttributes` is -- one source of truth for a type that must compile
/// identically into both targets.
public enum LiveTripSharedStore {
  public static let suiteName = "group.com.sousadev.saomiguelhub"

  private static let stringsKeyPrefix = "live_trip_strings."

  private static var defaults: UserDefaults? {
    UserDefaults(suiteName: suiteName)
  }

  /// `strings` as a `[String: String]` — the same nine fields as
  /// `LiveTripStrings` in `features/transit/lib/live-trip-state.ts`.
  public static func saveStrings(_ strings: [String: String], forActivityKey activityKey: String) {
    guard let defaults, let data = try? JSONEncoder().encode(strings) else {
      return
    }
    defaults.set(data, forKey: stringsKeyPrefix + activityKey)
  }

  /// `nil` when the suite is unreachable (App Group entitlement mismatch,
  /// cleared app data, first push right after reinstall) — callers must fall
  /// back to `LiveTripFallbackStrings`, never render blank.
  public static func loadStrings(forActivityKey activityKey: String) -> [String: String]? {
    guard let defaults, let data = defaults.data(forKey: stringsKeyPrefix + activityKey) else {
      return nil
    }
    return try? JSONDecoder().decode([String: String].self, from: data)
  }

  public static func clearStrings(forActivityKey activityKey: String) {
    defaults?.removeObject(forKey: stringsKeyPrefix + activityKey)
  }
}
