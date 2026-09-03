package expo.modules.livetrip

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.roundToInt

private const val TAG = "LiveTripPoller"

/**
 * One HTTP round trip plus the pure arithmetic that turns its answer into a
 * `LiveTripSnapshot`-shaped `JSONObject`.
 *
 * This duplicates two small pieces of TypeScript by necessity, not by
 * choice -- Kotlin has no JS to call into:
 *
 *   - which leg is current (`features/transit/lib/live-trip-legs.ts`
 *     `currentLegIndex`)
 *   - how a `/trips/live` row becomes a snapshot
 *     (`features/transit/lib/live-trip-state.ts` `liveTripSnapshotFrom`)
 *
 * Keep this in step with those two functions by hand; there is no shared
 * codegen. `HttpURLConnection` + `org.json` only, so this module's
 * `build.gradle` gains no new dependency.
 */
object LiveTripPoller {
  /** `HttpURLConnection`, not a stream, times out on its own eventually; this bounds it. */
  private const val TIMEOUT_MS = 10_000

  /** The leg being ridden, else the one about to be boarded, else the last. */
  fun currentLegIndex(legs: List<Pair<Int, IntRange>>, minutes: Int): Int {
    if (legs.isEmpty()) return 0
    for (i in legs.indices) {
      if (minutes <= legs[i].second.last) return i
    }
    return legs.size - 1
  }

  /**
   * One poll tick: pick the current leg, fetch its live row, fold it into a
   * snapshot. Never throws -- any failure returns a `stale` snapshot built
   * from `previous`, because a quiet bar beats a vanished one.
   */
  fun poll(config: JSONObject, previous: JSONObject?): JSONObject {
    val legsJson = config.getJSONArray("legs")
    val legs = (0 until legsJson.length()).map { i ->
      val leg = legsJson.getJSONObject(i)
      leg.getInt("tripId") to (leg.getInt("startMinutes")..leg.getInt("endMinutes"))
    }
    val departureDayStartMs = config.optDouble("departureDayStartMs", 0.0)
    val nowMinutes = ((System.currentTimeMillis() - departureDayStartMs) / 60_000.0).toInt()
    val legIndex = currentLegIndex(legs, nowMinutes)
    val span = legs.getOrNull(legIndex)?.second

    val phase = when {
      span == null -> "waiting"
      nowMinutes < span.first -> "waiting"
      nowMinutes > span.last -> "completed"
      else -> "riding"
    }
    val progress = when {
      phase == "completed" -> 1.0
      phase == "waiting" || span == null || span.last <= span.first -> 0.0
      else -> ((nowMinutes - span.first).toDouble() / (span.last - span.first)).coerceIn(0.0, 1.0)
    }

    val tripId = legs.getOrNull(legIndex)?.first
    val row = if (tripId != null) fetchTripLive(config, tripId) else null

    return buildSnapshot(phase, progress, row, previous)
  }

  private fun fetchTripLive(config: JSONObject, tripId: Int): JSONObject? {
    return try {
      val apiBase = config.getString("apiBase").trimEnd('/')
      val url = URL("$apiBase/api/v3/azoresbus/trips/live?tripIds=$tripId")
      val connection = url.openConnection() as HttpURLConnection
      connection.connectTimeout = TIMEOUT_MS
      connection.readTimeout = TIMEOUT_MS
      connection.setRequestProperty("X-Island", config.getString("islandKey"))
      // Required: the endpoint's throttle is session-scoped and falls back to
      // client IP without this header, which on carrier CGNAT rate-limits
      // unrelated users sharing that IP.
      connection.setRequestProperty("X-Session-Id", config.optString("sessionId", ""))
      connection.requestMethod = "GET"

      if (connection.responseCode != HttpURLConnection.HTTP_OK) {
        Log.w(TAG, "trips/live returned ${connection.responseCode}")
        return null
      }
      val body = connection.inputStream.bufferedReader().use { it.readText() }
      val trips = JSONObject(body).optJSONArray("trips") ?: JSONArray()
      (0 until trips.length())
        .map { trips.getJSONObject(it) }
        .firstOrNull { it.optInt("tripId") == tripId }
    } catch (error: Exception) {
      Log.w(TAG, "trips/live poll failed: ${error.message}")
      null
    }
  }

  /** Mirrors `liveTripSnapshotFrom` in `features/transit/lib/live-trip-state.ts`. */
  private fun buildSnapshot(
    phase: String,
    progress: Double,
    row: JSONObject?,
    previous: JSONObject?,
  ): JSONObject {
    val vehicle = if (row?.optString("state") == "live") row.optJSONObject("vehicle") else null
    val stale = vehicle?.optBoolean("stale", false) ?: false
    val trusted = if (vehicle != null && !stale) vehicle else null
    val nextStop = trusted?.optJSONObject("nextStop")
    val minutesToNextStop = nextStop?.let { if (it.isNull("dueInMinutes")) null else it.optInt("dueInMinutes") }

    var state = phase
    if (phase == "riding" && stale) {
      state = "stale"
    } else if (phase == "riding" && minutesToNextStop != null && minutesToNextStop <= 1) {
      state = "arriving"
    }

    val delaySeconds = vehicle?.let { if (it.isNull("delaySeconds")) null else it.optDouble("delaySeconds") }

    return JSONObject().apply {
      put("v", 1)
      put("state", state)
      put("nextStopName", nextStop?.optString("name")?.takeIf { it.isNotEmpty() } ?: JSONObject.NULL)
      put("minutesToNextStop", minutesToNextStop ?: JSONObject.NULL)
      put(
        "delayMinutes",
        delaySeconds?.let { (it / 60.0).roundToInt() }
          ?: previous?.opt("delayMinutes")?.takeIf { row != null } // keep last-known delay only if we heard back at all
          ?: JSONObject.NULL,
      )
      put("progress", progress)
      put("updatedAtEpochMs", System.currentTimeMillis().toDouble())
    }
  }
}
