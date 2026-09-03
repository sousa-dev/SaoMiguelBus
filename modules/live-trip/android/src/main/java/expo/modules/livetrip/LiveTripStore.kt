package expo.modules.livetrip

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * Survives process death.
 *
 * `LiveTripService` runs with `START_REDELIVER_INTENT`, so the OS is free to
 * kill and restart it -- and when it does, the original start `Intent` extras
 * may or may not still be there. The service rebuilds its config and last
 * snapshot from here instead of trusting the intent, and self-terminates if
 * `endsAtEpochMs` has already passed by the time it wakes back up.
 *
 * Plain `SharedPreferences` + `org.json`, matching this module's stated
 * zero-new-dependency shape (no Gson/kotlinx.serialization for one small blob).
 */
object LiveTripStore {
  private const val PREFS_NAME = "live_trip_store"
  private const val KEY_CONFIG = "config"
  private const val KEY_SNAPSHOT = "snapshot"

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun saveConfig(context: Context, config: JSONObject) {
    prefs(context).edit().putString(KEY_CONFIG, config.toString()).apply()
  }

  fun loadConfig(context: Context): JSONObject? =
    prefs(context).getString(KEY_CONFIG, null)?.let {
      runCatching { JSONObject(it) }.getOrNull()
    }

  fun saveSnapshot(context: Context, snapshot: JSONObject) {
    prefs(context).edit().putString(KEY_SNAPSHOT, snapshot.toString()).apply()
  }

  fun loadSnapshot(context: Context): JSONObject? =
    prefs(context).getString(KEY_SNAPSHOT, null)?.let {
      runCatching { JSONObject(it) }.getOrNull()
    }

  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }
}
