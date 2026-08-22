package expo.modules.exactalarm

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The three exact-alarm APIs `expo-notifications` does not expose to JavaScript.
 *
 * See ../../../../../../README.md for why this module exists at all. In short:
 * the library silently falls back to an INEXACT alarm when the permission is
 * missing, so there is no crash — but also no signal, and the app would schedule
 * "get off at the next stop" believing it had been honoured while the OS delivers
 * it up to half an hour late.
 *
 * Nothing here schedules anything. It answers one question — will the next alarm
 * be exact? — and offers the route to change the answer.
 */
class ExactAlarmModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val alarmManager: AlarmManager
    get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  /**
   * True below Android 12, where exact alarms need no permission at all and the
   * question does not arise. Returning true there is not an optimistic guess —
   * it is what the platform actually does.
   */
  private fun canSchedule(): Boolean =
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) true
    else alarmManager.canScheduleExactAlarms()

  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    Events("onExactAlarmPermissionChange")

    Function("canScheduleExactAlarms") {
      canSchedule()
    }

    /**
     * Opens the system screen for THIS app's exact-alarm permission.
     *
     * Android offers no runtime dialog for it — unlike notification permission,
     * a settings destination is the only route. The data URI scopes the screen
     * to this package; without it the intent lands on the general list.
     */
    Function("openSettings") {
      // Written as a positive guard rather than an early `return@Function`:
      // Expo types a `Function` body as returning `Any?`, and Kotlin only
      // permits a valueless `return@label` when the expected type is `Unit`.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }

    /**
     * Catches a grant (or revocation) made OUTSIDE the app's own flow — the
     * rider wandering into system settings on their own. The foreground check in
     * `useNotificationPermissionResume` covers the round trip we started; this
     * covers the one we did not.
     */
    OnStartObserving {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || receiver != null) {
        return@OnStartObserving
      }
      val created = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
          sendEvent(
            "onExactAlarmPermissionChange",
            Bundle().apply { putBoolean("granted", canSchedule()) },
          )
        }
      }
      val filter = IntentFilter(AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED)
      // A protected system broadcast addressed to this app, so it must be
      // registered as not-exported on Android 13+ — an exported receiver for a
      // system-only action is both unnecessary and flagged in review.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(created, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        context.registerReceiver(created, filter)
      }
      receiver = created
    }

    OnStopObserving {
      receiver?.let {
        // Tolerated rather than guarded: the receiver can already be gone if the
        // context was torn down first, and an unregister that throws here would
        // take down a teardown path for nothing.
        runCatching { context.unregisterReceiver(it) }
        receiver = null
      }
    }
  }
}
