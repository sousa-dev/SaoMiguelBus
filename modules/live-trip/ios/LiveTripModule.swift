import ActivityKit
import ExpoModulesCore

/// Mirrors `LiveTripLegWindow` in `features/transit/lib/live-trip-legs.ts`.
/// Unused directly by ActivityKit (iOS has no polling loop to feed) but kept
/// on the config record for symmetry with the Android side and in case a
/// future revision wants the app to reconstruct `endsAtEpochMs` natively.
struct LiveTripLegWindowRecord: Record {
  @Field var tripId: Int = 0
  @Field var startMinutes: Int = 0
  @Field var endMinutes: Int = 0
}

/// Mirrors `LiveTripStrings` in `features/transit/lib/live-trip-state.ts`
/// field for field. Keep the two in sync by hand.
struct LiveTripStringsRecord: Record {
  @Field var locale: String = "pt"
  @Field var title: String = ""
  @Field var waiting: String = ""
  @Field var riding: String = ""
  @Field var arriving: String = ""
  @Field var late: String = ""
  @Field var onTime: String = ""
  @Field var stale: String = ""
  @Field var completed: String = ""

  var asDictionary: [String: String] {
    [
      "locale": locale, "title": title, "waiting": waiting, "riding": riding,
      "arriving": arriving, "late": late, "onTime": onTime, "stale": stale,
      "completed": completed,
    ]
  }
}

/// Mirrors `LiveTripSnapshot`.
struct LiveTripSnapshotRecord: Record {
  @Field var state: String = "waiting"
  @Field var nextStopName: String? = nil
  @Field var minutesToNextStop: Int? = nil
  @Field var delayMinutes: Int? = nil
  @Field var progress: Double = 0
  @Field var updatedAtEpochMs: Double = 0

  var asContentState: LiveTripAttributes.ContentState {
    .init(
      state: state,
      nextStopName: nextStopName,
      minutesToNextStop: minutesToNextStop,
      delayMinutes: delayMinutes,
      progress: progress,
      updatedAtEpochMs: updatedAtEpochMs
    )
  }
}

struct LiveTripStartConfigRecord: Record {
  @Field var activityKey: String = ""
  @Field var deepLink: String = ""
  @Field var route: String = ""
  @Field var destination: String = ""
  @Field var endsAtEpochMs: Double = 0
  @Field var legs: [LiveTripLegWindowRecord] = []
  @Field var strings: LiveTripStringsRecord = LiveTripStringsRecord()
}

private extension Data {
  /// The lowercase hex APNs expects for a device/activity push token. This is
  /// an ActivityKit push token, NOT an Expo push token -- Expo's push service
  /// does not proxy the `liveactivity` push type, so this hex string is what
  /// gets registered with our own API in `azoresbus/services_live_activity.py`.
  var hexString: String {
    map { String(format: "%02x", $0) }.joined()
  }
}

/// JS entry point for the live trip bar's iOS half: ActivityKit.
///
/// Unlike Android, there is no polling loop here -- a Live Activity started
/// in the foreground is kept fresh by APNs pushes from the Django beat task
/// (`azoresbus.push_live_activities`), which is why `start()` requests
/// `pushType: .token` and why `onPushToken` exists at all: without a channel
/// to hand that token to the server, the activity would render once and
/// freeze the moment the app backgrounds.
public class LiveTripModule: Module {
  /// One entry per running activity, so `stop()` can cancel cleanly rather
  /// than leaking a `for await` loop per activity for the life of the process.
  private var observers: [String: [Task<Void, Never>]] = [:]

  public func definition() -> ModuleDefinition {
    Name("LiveTrip")

    Events("onPushToken", "onStateChange")

    AsyncFunction("start") { (config: LiveTripStartConfigRecord) -> [String: Any] in
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        return ["started": false, "backend": "none"]
      }

      LiveTripSharedStore.saveStrings(config.strings.asDictionary, forActivityKey: config.activityKey)

      let attributes = LiveTripAttributes(
        activityKey: config.activityKey,
        deepLink: config.deepLink,
        route: config.route,
        destination: config.destination
      )
      // Waiting/default content -- the real first snapshot arrives via the
      // first push or the first `update()` call while foregrounded. A stale
      // date bounds how long a frozen card can keep showing a confident wrong
      // ETA if pushes ever stop arriving (Apple also enforces an activity
      // ceiling of its own on top of this).
      let waiting = LiveTripAttributes.ContentState(
        state: "waiting", nextStopName: nil, minutesToNextStop: nil,
        delayMinutes: nil, progress: 0, updatedAtEpochMs: Date().timeIntervalSince1970 * 1000
      )
      let content = ActivityContent(state: waiting, staleDate: Date().addingTimeInterval(Self.staleAfterSeconds))

      do {
        let activity = try Activity<LiveTripAttributes>.request(
          attributes: attributes, content: content, pushType: .token
        )
        self.observe(activity, activityKey: config.activityKey)
        return ["started": true, "backend": "iosLiveActivity"]
      } catch {
        return ["started": false, "backend": "none"]
      }
    }

    // The in-app path only -- correct the instant the app is open, ahead of
    // whatever the next push brings. `staleDate` is refreshed on every call so
    // a foregrounded rider watching the bar never sees it flip to "stale"
    // purely because the server's minute-cadence push hasn't landed yet.
    AsyncFunction("update") { (activityKey: String, snapshot: LiveTripSnapshotRecord) in
      guard let activity = self.activity(for: activityKey) else { return }
      let content = ActivityContent(
        state: snapshot.asContentState,
        staleDate: Date().addingTimeInterval(Self.staleAfterSeconds)
      )
      await activity.update(content)
    }

    AsyncFunction("updateStrings") { (activityKey: String, strings: LiveTripStringsRecord) in
      LiveTripSharedStore.saveStrings(strings.asDictionary, forActivityKey: activityKey)
      // The templates live in the shared suite, not in `ContentState` -- a
      // no-op content update just forces the widget to re-render against the
      // suite it already re-reads on every render.
      guard let activity = self.activity(for: activityKey) else { return }
      await activity.update(activity.content)
    }

    AsyncFunction("stop") {
      for activity in Activity<LiveTripAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
        LiveTripSharedStore.clearStrings(forActivityKey: activity.attributes.activityKey)
      }
      self.observers.values.forEach { $0.forEach { $0.cancel() } }
      self.observers.removeAll()
    }

    AsyncFunction("listLiveTrips") { () -> [[String: Any?]] in
      Activity<LiveTripAttributes>.activities.map { activity in
        ["activityKey": activity.attributes.activityKey, "pushToken": activity.pushToken?.hexString]
      }
    }

    Function("isRunning") { () -> Bool in
      !Activity<LiveTripAttributes>.activities.isEmpty
    }
  }

  /// Bounds how long a frozen card can keep showing a confident wrong ETA
  /// between pushes. The beat task pushes roughly once a minute; this is
  /// generous enough to absorb one missed push without flapping to "stale".
  private static let staleAfterSeconds: TimeInterval = 4 * 60

  private func activity(for activityKey: String) -> Activity<LiveTripAttributes>? {
    Activity<LiveTripAttributes>.activities.first { $0.attributes.activityKey == activityKey }
  }

  private func observe(_ activity: Activity<LiveTripAttributes>, activityKey: String) {
    let tokenTask = Task { [weak self] in
      for await tokenData in activity.pushTokenUpdates {
        self?.sendEvent("onPushToken", ["activityKey": activityKey, "token": tokenData.hexString])
      }
    }
    let stateTask = Task { [weak self] in
      for await state in activity.activityStateUpdates {
        self?.sendEvent("onStateChange", ["activityKey": activityKey, "state": "\(state)"])
      }
    }
    observers[activityKey, default: []].append(contentsOf: [tokenTask, stateTask])
  }
}
