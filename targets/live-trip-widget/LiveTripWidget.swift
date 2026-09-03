import ActivityKit
import SwiftUI
import WidgetKit

/// The Live Activity: Lock Screen banner + all three Dynamic Island regions.
///
/// Deliberately dependency-free SwiftUI (no pods) -- the moment this widget
/// needs a CocoaPod it enters the blanket `SWIFT_VERSION = '5.0'` override in
/// `plugins/withIosBuildFixes.js`'s Podfile patch, written for the app's own
/// Pods targets, not an extension.
struct LiveTripWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveTripAttributes.self) { context in
      LiveTripLockScreenView(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "bus.fill").foregroundStyle(.accent)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if let minutes = context.state.minutesToNextStop {
            Text("\(minutes)m").font(.title3.monospacedDigit())
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          LiveTripDynamicIslandViews.expanded(context)
        }
      } compactLeading: {
        LiveTripDynamicIslandViews.compactLeading(context)
      } compactTrailing: {
        LiveTripDynamicIslandViews.compactTrailing(context)
      } minimal: {
        LiveTripDynamicIslandViews.minimal(context)
      }
      .widgetURL(URL(string: context.attributes.deepLink))
    }
  }
}

@main
struct LiveTripWidgetBundle: WidgetBundle {
  var body: some Widget {
    LiveTripWidget()
  }
}
