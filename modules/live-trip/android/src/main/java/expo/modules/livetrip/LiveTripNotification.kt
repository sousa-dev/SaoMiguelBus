package expo.modules.livetrip

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

/**
 * Builds the ongoing trip notification.
 *
 * All user-facing text arrives pre-localized from JS as `{placeholder}`
 * templates (`features/transit/lib/live-trip-state.ts` `liveTripStrings`) --
 * this file only substitutes values into them: one template per state, never
 * fragments concatenated together, because concatenation is exactly what
 * breaks a language whose clauses reorder or whose numbers need agreement. No
 * Android string resources, no translations here: a copy change is a JS
 * change, never a native release.
 */
object LiveTripNotification {
  const val CHANNEL_ID = "live-trip"
  const val NOTIFICATION_ID = 87231

  fun ensureChannel(context: Context) {
    val manager = NotificationManagerCompat.from(context)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }
    // LOW, deliberately, and its own channel: this updates roughly once a
    // minute and must never buzz like an alarm. `journey-alarms` is HIGH and
    // Android freezes a channel's importance at creation, so reusing it was
    // never an option even before considering what it is for.
    val channel = NotificationChannelCompat
      .Builder(CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_LOW)
      .setName("Live trip")
      .setShowBadge(false)
      .build()
    manager.createNotificationChannel(channel)
  }

  private fun interpolate(template: String, values: Map<String, String>): String {
    var out = template
    for ((key, value) in values) {
      out = out.replace("{$key}", value)
    }
    return out
  }

  private fun localeFor(tag: String): Locale =
    runCatching { Locale.forLanguageTag(tag) }.getOrDefault(Locale.getDefault())

  private fun formatNumber(value: Int, locale: String): String =
    NumberFormat.getInstance(localeFor(locale)).format(value)

  /** [config] is the JSON form of `LiveTripStartConfigRecord`, [snapshot] of `LiveTripSnapshotRecord`. */
  fun build(context: Context, config: JSONObject, snapshot: JSONObject): Notification {
    ensureChannel(context)

    val strings = config.getJSONObject("strings")
    val locale = strings.optString("locale", "pt")
    val route = config.optString("route", "")
    val destination = config.optString("destination", "")
    val eta = config.optString("eta", "")

    val title = interpolate(
      strings.getString("title"),
      mapOf("route" to route, "destination" to destination),
    )

    val state = snapshot.optString("state", "waiting")
    val nextStop = snapshot.optString("nextStopName", "")
    val minutesToNextStop = if (snapshot.isNull("minutesToNextStop")) {
      null
    } else {
      snapshot.optInt("minutesToNextStop")
    }
    val delayMinutes = if (snapshot.isNull("delayMinutes")) null else snapshot.optInt("delayMinutes")

    val body = when (state) {
      "waiting" -> interpolate(strings.getString("waiting"), mapOf("time" to eta))
      "arriving" -> interpolate(strings.getString("arriving"), mapOf("stop" to nextStop))
      "completed" -> strings.getString("completed")
      "stale" -> strings.getString("stale")
      else -> interpolate(
        strings.getString("riding"),
        mapOf(
          "stop" to nextStop,
          "minutes" to formatNumber(minutesToNextStop ?: 0, locale),
        ),
      )
    }

    // Delay comes from the fleet list, independent of whether the detail read
    // that gives a stop ETA succeeded -- so this can still say "4 min late"
    // even in the `stale` state. See `liveTripSnapshotFrom` for the JS rule
    // this mirrors.
    val subText = when {
      delayMinutes == null -> null
      delayMinutes >= 2 -> interpolate(
        strings.getString("late"),
        mapOf("minutes" to formatNumber(delayMinutes, locale)),
      )
      else -> strings.getString("onTime")
    }

    val deepLink = config.optString("deepLink", "")
    val contentIntent = if (deepLink.isNotEmpty()) {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
        setPackage(context.packageName)
      }
      PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    } else {
      null
    }

    val progressPercent = (snapshot.optDouble("progress", 0.0).coerceIn(0.0, 1.0) * 100).toInt()

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setContentTitle(title)
      .setContentText(body)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .setPriority(NotificationCompat.PRIORITY_LOW)
    if (subText != null) {
      builder.setSubText(subText)
    }
    if (contentIntent != null) {
      builder.setContentIntent(contentIntent)
    }

    // Android 16 (API 36) promoted "Live Update" -- status-bar chip, richer
    // placement. `androidx.core:core-ktx:1.17.0` (declared in this module's
    // build.gradle) is the first release exposing `ProgressStyle` and
    // `setRequestPromotedOngoing`; exact method names should be re-confirmed
    // against that release's Javadoc during the Android Studio build in
    // plan Task 4, since this environment cannot compile Kotlin to verify it.
    if (Build.VERSION.SDK_INT >= 36) {
      builder
        .setStyle(NotificationCompat.ProgressStyle().setProgress(progressPercent))
        .setShortCriticalText(
          if (minutesToNextStop != null) formatNumber(minutesToNextStop, locale) else null,
        )
        .setRequestPromotedOngoing(true)
    } else {
      builder.setProgress(100, progressPercent, false)
    }

    return builder.build()
  }
}
