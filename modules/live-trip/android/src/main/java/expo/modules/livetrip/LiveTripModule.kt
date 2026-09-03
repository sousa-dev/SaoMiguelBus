package expo.modules.livetrip

import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

/**
 * JS entry point for the live trip bar. See ../../../README.md for why this
 * is a foreground service rather than an `expo-notifications` schedule.
 *
 * Android has no push channel for this bar -- the service itself IS the
 * mechanism -- so `listLiveTrips()` always reports a null `pushToken`. The
 * shared JS interface (`lib/live-trip/native.ts`) still calls it on every
 * foreground so the one re-sync code path works identically once the iOS
 * half, which DOES rotate tokens, exists.
 */
class LiveTripModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("LiveTrip")

    AsyncFunction("start") { config: LiveTripStartConfigRecord ->
      val json = toJson(config)
      val intent = Intent(context, LiveTripService::class.java).apply {
        putExtra(LiveTripService.EXTRA_CONFIG, json.toString())
      }
      ContextCompat.startForegroundService(context, intent)
      mapOf("started" to true, "backend" to "androidForegroundService")
    }

    // Optimistic paint only: the service is the source of truth on Android
    // and will overwrite this on its next poll regardless. It exists so the
    // shared JS interface (`lib/live-trip/native.ts`) never has to branch on
    // platform for the one path iOS actually depends on.
    AsyncFunction("update") { activityKey: String, snapshot: LiveTripSnapshotRecord ->
      val config = LiveTripStore.loadConfig(context)
      if (config == null || config.optString("activityKey") != activityKey) {
        return@AsyncFunction
      }
      val snapshotJson = toSnapshotJson(snapshot)
      LiveTripStore.saveSnapshot(context, snapshotJson)
      NotificationManagerCompat.from(context)
        .notify(LiveTripNotification.NOTIFICATION_ID, LiveTripNotification.build(context, config, snapshotJson))
    }

    AsyncFunction("updateStrings") { activityKey: String, strings: LiveTripStringsRecord ->
      val config = LiveTripStore.loadConfig(context)
      if (config == null || config.optString("activityKey") != activityKey) {
        return@AsyncFunction
      }
      config.put("strings", toStringsJson(strings))
      LiveTripStore.saveConfig(context, config)
      val snapshot = LiveTripStore.loadSnapshot(context) ?: return@AsyncFunction
      NotificationManagerCompat.from(context)
        .notify(LiveTripNotification.NOTIFICATION_ID, LiveTripNotification.build(context, config, snapshot))
    }

    AsyncFunction("stop") {
      context.stopService(Intent(context, LiveTripService::class.java))
      NotificationManagerCompat.from(context).cancel(LiveTripNotification.NOTIFICATION_ID)
      LiveTripStore.clear(context)
    }

    AsyncFunction("listLiveTrips") {
      val config = LiveTripStore.loadConfig(context)
      if (config == null) {
        emptyList<Map<String, Any?>>()
      } else {
        listOf(mapOf("activityKey" to config.optString("activityKey"), "pushToken" to null))
      }
    }

    Function("isRunning") {
      LiveTripStore.loadConfig(context) != null
    }
  }

  private fun toJson(config: LiveTripStartConfigRecord): JSONObject = JSONObject().apply {
    put("activityKey", config.activityKey)
    put("apiBase", config.apiBase)
    put("islandKey", config.islandKey)
    put("sessionId", config.sessionId)
    put("departureDayStartMs", config.departureDayStartMs)
    put("endsAtEpochMs", config.endsAtEpochMs)
    put("deepLink", config.deepLink)
    put("route", config.route)
    put("destination", config.destination)
    put("eta", config.eta)
    put("intervalMs", config.intervalMs)
    put(
      "legs",
      JSONArray(
        config.legs.map { leg ->
          JSONObject().apply {
            put("tripId", leg.tripId)
            put("startMinutes", leg.startMinutes)
            put("endMinutes", leg.endMinutes)
          }
        },
      ),
    )
    put("strings", toStringsJson(config.strings))
  }

  private fun toStringsJson(strings: LiveTripStringsRecord): JSONObject = JSONObject().apply {
    put("locale", strings.locale)
    put("title", strings.title)
    put("waiting", strings.waiting)
    put("riding", strings.riding)
    put("arriving", strings.arriving)
    put("late", strings.late)
    put("onTime", strings.onTime)
    put("stale", strings.stale)
    put("completed", strings.completed)
  }

  private fun toSnapshotJson(snapshot: LiveTripSnapshotRecord): JSONObject = JSONObject().apply {
    put("v", 1)
    put("state", snapshot.state)
    put("nextStopName", snapshot.nextStopName ?: JSONObject.NULL)
    put("minutesToNextStop", snapshot.minutesToNextStop ?: JSONObject.NULL)
    put("delayMinutes", snapshot.delayMinutes ?: JSONObject.NULL)
    put("progress", snapshot.progress)
    put("updatedAtEpochMs", snapshot.updatedAtEpochMs)
  }
}
