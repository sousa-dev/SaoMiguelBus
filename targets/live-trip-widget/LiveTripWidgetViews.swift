import ActivityKit
import SwiftUI
import WidgetKit

/// `{key}` substitution — the same convention as
/// `features/transit/lib/live-trip-state.ts` (native selects a template and
/// substitutes; it never concatenates fragments, which is what would break a
/// language whose clauses reorder or whose numbers need agreement).
private func substituted(_ template: String, _ values: [String: String]) -> String {
  var out = template
  for (key, value) in values {
    out = out.replacingOccurrences(of: "{\(key)}", with: value)
  }
  return out
}

/// Resolves the localized templates for one activity: the shared App Group
/// suite first, the compiled-in `pt` dictionary if that suite is unreadable.
func liveTripStrings(for activityKey: String) -> [String: String] {
  LiveTripSharedStore.loadStrings(forActivityKey: activityKey) ?? LiveTripFallbackStrings.values
}

private func bodyText(
  state: LiveTripAttributes.ContentState,
  strings: [String: String]
) -> String {
  let stop = state.nextStopName ?? ""
  let minutes = state.minutesToNextStop.map(String.init) ?? ""
  switch state.state {
  case "waiting":
    return substituted(strings["waiting"] ?? "", ["time": minutes])
  case "arriving":
    return substituted(strings["arriving"] ?? "", ["stop": stop])
  case "completed":
    return strings["completed"] ?? ""
  case "stale":
    return strings["stale"] ?? ""
  default: // "riding"
    return substituted(strings["riding"] ?? "", ["stop": stop, "minutes": minutes])
  }
}

/// Delay comes from the fleet list independent of whether the detail read
/// that gives a stop ETA succeeded, so this can still say "4 min late" even
/// in the `stale` state — mirroring `liveTripSnapshotFrom` on the JS side.
private func subText(state: LiveTripAttributes.ContentState, strings: [String: String]) -> String? {
  guard let delay = state.delayMinutes else { return nil }
  if delay >= 2 {
    return substituted(strings["late"] ?? "", ["minutes": String(delay)])
  }
  return strings["onTime"]
}

private func titleText(attrs: LiveTripAttributes, strings: [String: String]) -> String {
  substituted(strings["title"] ?? "", ["route": attrs.route, "destination": attrs.destination])
}

// MARK: - Lock Screen / banner

struct LiveTripLockScreenView: View {
  let context: ActivityViewContext<LiveTripAttributes>

  var body: some View {
    let strings = liveTripStrings(for: context.attributes.activityKey)
    VStack(alignment: .leading, spacing: 4) {
      Text(titleText(attrs: context.attributes, strings: strings))
        .font(.headline)
      Text(bodyText(state: context.state, strings: strings))
        .font(.subheadline)
        .foregroundStyle(.secondary)
      if let subText = subText(state: context.state, strings: strings) {
        Text(subText)
          .font(.caption)
          .foregroundStyle(context.state.state == "stale" ? .orange : .secondary)
      }
      ProgressView(value: context.state.progress)
        .tint(.accentColor)
    }
    .padding()
    .activityBackgroundTint(Color("WidgetBackground"))
  }
}

// MARK: - Dynamic Island

struct LiveTripDynamicIslandViews {
  static func compactLeading(_ context: ActivityViewContext<LiveTripAttributes>) -> some View {
    Image(systemName: "bus.fill")
      .foregroundStyle(.accent)
  }

  static func compactTrailing(_ context: ActivityViewContext<LiveTripAttributes>) -> some View {
    if let minutes = context.state.minutesToNextStop {
      Text("\(minutes)m")
        .font(.caption2.monospacedDigit())
    } else {
      Text(context.attributes.route)
        .font(.caption2)
    }
  }

  static func minimal(_ context: ActivityViewContext<LiveTripAttributes>) -> some View {
    Image(systemName: "bus.fill")
      .foregroundStyle(.accent)
  }

  static func expanded(_ context: ActivityViewContext<LiveTripAttributes>) -> some View {
    let strings = liveTripStrings(for: context.attributes.activityKey)
    return VStack(alignment: .leading, spacing: 4) {
      Text(titleText(attrs: context.attributes, strings: strings))
        .font(.headline)
      Text(bodyText(state: context.state, strings: strings))
        .font(.subheadline)
        .foregroundStyle(.secondary)
      ProgressView(value: context.state.progress)
        .tint(.accentColor)
    }
    .padding(.horizontal)
  }
}
