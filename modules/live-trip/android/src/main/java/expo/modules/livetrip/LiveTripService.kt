package expo.modules.livetrip

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * The foreground service that keeps the trip bar alive after the app is
 * closed.
 *
 * Not `WorkManager` -- its floor is 15 minutes, far too coarse for a bar meant
 * to update roughly every minute. Not an `IntentService` -- this needs to keep
 * running across many ticks, not process one intent and stop.
 *
 * Failures degrade, never kill: any polling error keeps the last known
 * snapshot on screen rather than tearing the notification down, mirroring
 * `fetchTransitTripsLive` on the JS side, which already collapses every API
 * error into "no live data" instead of a thrown error.
 */
class LiveTripService : Service() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private var pollJob: Job? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // `START_REDELIVER_INTENT` means the OS may restart this service and
    // redeliver the original intent -- but it may not, so config is always
    // persisted and re-read from there, never trusted to arrive on the intent.
    val fromIntent = intent?.getStringExtra(EXTRA_CONFIG)?.let {
      runCatching { JSONObject(it) }.getOrNull()
    }
    val config = fromIntent ?: LiveTripStore.loadConfig(this)
    if (config == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    LiveTripStore.saveConfig(this, config)

    val previous = LiveTripStore.loadSnapshot(this)
    val notification = LiveTripNotification.build(this, config, previous ?: waitingSnapshot())

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceCompat.startForeground(
        this,
        LiveTripNotification.NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
      )
    } else {
      @Suppress("DEPRECATION")
      startForeground(LiveTripNotification.NOTIFICATION_ID, notification)
    }

    startPolling(config)
    return START_REDELIVER_INTENT
  }

  private fun waitingSnapshot(): JSONObject = JSONObject().apply {
    put("v", 1)
    put("state", "waiting")
    put("nextStopName", JSONObject.NULL)
    put("minutesToNextStop", JSONObject.NULL)
    put("delayMinutes", JSONObject.NULL)
    put("progress", 0.0)
    put("updatedAtEpochMs", System.currentTimeMillis().toDouble())
  }

  private fun startPolling(config: JSONObject) {
    pollJob?.cancel()
    val intervalMs = config.optDouble("intervalMs", 60_000.0).toLong()
    val endsAtEpochMs = config.optDouble("endsAtEpochMs", 0.0)

    pollJob = scope.launch {
      while (isActive) {
        if (endsAtEpochMs > 0 && System.currentTimeMillis() > endsAtEpochMs + END_GRACE_MS) {
          finish()
          return@launch
        }

        val previous = LiveTripStore.loadSnapshot(this@LiveTripService)
        val snapshot = runCatching { LiveTripPoller.poll(config, previous) }
          .getOrElse { previous ?: waitingSnapshot() }
        LiveTripStore.saveSnapshot(this@LiveTripService, snapshot)
        notify(config, snapshot)

        if (snapshot.optString("state") == "completed") {
          finish()
          return@launch
        }
        delay(intervalMs)
      }
    }
  }

  /**
   * Android 15+ caps a `dataSync` foreground service at roughly 6 cumulative
   * hours per 24h and calls this instead of simply killing the process.
   * Returning late throws `ForegroundServiceDidNotStopInTimeException` -- a
   * crash, not a warning -- so this must finish within a couple of seconds.
   * The budget is cumulative, so a rider's second long trip of the day may
   * get less than a fresh 6 hours; a bus trip is under two, so this is a
   * backstop, not a normal path.
   */
  override fun onTimeout(startId: Int, fgsType: Int) {
    val config = LiveTripStore.loadConfig(this)
    val previous = LiveTripStore.loadSnapshot(this)
    if (config != null && previous != null) {
      val stale = JSONObject(previous.toString()).put("state", "stale")
      LiveTripStore.saveSnapshot(this, stale)
      notify(config, stale)
    }
    finish()
  }

  private fun notify(config: JSONObject, snapshot: JSONObject) {
    NotificationManagerCompat.from(this)
      .notify(LiveTripNotification.NOTIFICATION_ID, LiveTripNotification.build(this, config, snapshot))
  }

  /** Leaves a frozen, plain (non-promoted) notification behind rather than clearing it silently. */
  private fun finish() {
    pollJob?.cancel()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_DETACH)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(false)
    }
    stopSelf()
  }

  override fun onDestroy() {
    scope.cancel()
    super.onDestroy()
  }

  companion object {
    const val EXTRA_CONFIG = "config"
    private const val END_GRACE_MS = 10 * 60_000L
  }
}
