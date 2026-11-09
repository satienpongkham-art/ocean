package com.lifesystem.app.lock

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.lifesystem.app.SystemApp
import com.lifesystem.app.data.Keys
import com.lifesystem.app.data.getBool
import com.lifesystem.app.data.getInt
import com.lifesystem.app.data.getSetting
import com.lifesystem.app.schedule.AlarmReceiver
import com.lifesystem.app.system.SystemSound
import com.lifesystem.engine.model.QuestType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.LocalTime

/**
 * Hard-mode lock + posture reminder without Accessibility (Play Protect blocks Accessibility for sideloaded apps):
 * while the screen is on, reads the foreground app from usage events and shows the lock screen when the rules say so.
 * Needs "usage access" and "display over other apps" (to bring the lock screen to the front).
 */
class GuardService : Service(), SensorEventListener {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val posture = PostureMonitor()
    private var never: Set<String> = emptySet()
    private var lastLockedPkg: String? = null
    private var lastLockMs = 0L
    private var lastPkg: String? = null

    private val screen = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) = if (i.action == Intent.ACTION_SCREEN_ON) startPosture() else stopPosture()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        never = LockRules.neverLock(this)
        goForeground()
        ContextCompat.registerReceiver(this, screen, IntentFilter().apply { addAction(Intent.ACTION_SCREEN_ON); addAction(Intent.ACTION_SCREEN_OFF) }, ContextCompat.RECEIVER_NOT_EXPORTED)
        startPosture()
        scope.launch {
            val pm = getSystemService(PowerManager::class.java)
            while (isActive) {
                if (pm.isInteractive) {
                    foregroundPackage()?.let { lastPkg = it }
                    lastPkg?.let { if (it !in never) decide(it) }
                    delay(1_200)
                } else delay(5_000)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    private fun foregroundPackage(): String? {
        val usm = getSystemService(UsageStatsManager::class.java)
        val now = System.currentTimeMillis()
        val ev = usm.queryEvents(now - 15_000, now)
        val e = UsageEvents.Event()
        var pkg: String? = null
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e)
            @Suppress("DEPRECATION")
            if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) pkg = e.packageName
        }
        return pkg
    }

    private suspend fun decide(pkg: String) {
        val repo = (application as SystemApp).repository
        val p = repo.profile() ?: return
        val today = SystemApp.today()
        val board = repo.board(today).first()
        fun done(id: String) = board.firstOrNull { it.questId == id }?.done ?: true
        val reason = LockRules.reason(LockInput(
            pkg = pkg, nowMs = System.currentTimeMillis(), nowMin = LocalTime.now().let { it.hour * 60 + it.minute }, wakeMin = p.wakeMin,
            trainingFromMin = repo.getInt(Keys.LOCK_TRAINING_FROM, 18 * 60), lockOn = repo.getBool(Keys.LOCK_ON, false),
            rest = repo.dao.day(today)?.rest == true, morningDone = done("wake") && done("weigh"), trainingDone = done("pushup") && done("squat"),
            penaltyPending = board.any { it.type == QuestType.PENALTY.name && !it.done },
            focusUntilMs = repo.getSetting(FOCUS_UNTIL, "0").toLongOrNull() ?: 0L,
            lockApps = repo.getSetting(Keys.LOCK_APPS, "").split(',').filter { it.isNotBlank() }.toSet(), never = never,
        )) ?: return
        if (pkg == lastLockedPkg && System.currentTimeMillis() - lastLockMs < 2_500) return
        lastLockedPkg = pkg; lastLockMs = System.currentTimeMillis()
        startActivity(Intent(this, LockActivity::class.java).putExtra(LockActivity.EXTRA_REASON, reason.name)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION))
    }

    private fun goForeground() {
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) nm.createNotificationChannel(NotificationChannel(CHANNEL, "System guard", NotificationManager.IMPORTANCE_MIN))
        val n = NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("[ SYSTEM ] เฝ้าระวังอยู่").setContentText("ล็อกแอป · Focus · ตรวจหลังค่อม").setOngoing(true).setSilent(true).build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE) else startForeground(NOTIF_ID, n)
    }

    // ---- posture ----
    private fun startPosture() {
        scope.launch {
            if (!(application as SystemApp).repository.getBool(Keys.POSTURE, true)) return@launch
            val sm = getSystemService(SensorManager::class.java)
            val g = sm.getDefaultSensor(Sensor.TYPE_GRAVITY) ?: sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return@launch
            sm.registerListener(this@GuardService, g, 5_000_000)
        }
    }

    private fun stopPosture() = getSystemService(SensorManager::class.java).unregisterListener(this)

    override fun onSensorChanged(e: SensorEvent) {
        if (posture.feed(System.currentTimeMillis(), PostureMonitor.lookingDown(e.values[0], e.values[1], e.values[2]))) {
            AlarmReceiver.ensureChannel(this)
            val n = NotificationCompat.Builder(this, AlarmReceiver.CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("[ SYSTEM ] ก้มมองจอ 15 นาทีแล้ว").setContentText("เงยหน้า ยืดหลัง chin tuck 10 ครั้ง · ยกจอขึ้นระดับสายตา")
                .setPriority(NotificationCompat.PRIORITY_HIGH).setAutoCancel(true).build()
            runCatching { getSystemService(NotificationManager::class.java).notify(7001, n) }
            SystemSound.play(this, SystemSound.Kind.ALERT)
        }
    }

    override fun onAccuracyChanged(s: Sensor?, a: Int) = Unit

    override fun onDestroy() {
        runCatching { unregisterReceiver(screen) }
        stopPosture()
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val FOCUS_UNTIL = "focus_until"
        private const val CHANNEL = "system_guard"
        private const val NOTIF_ID = 4343

        fun canOverlay(ctx: Context) = Settings.canDrawOverlays(ctx)

        /** Runs the guard while the lock, posture check or a focus session needs it; stops it otherwise. */
        suspend fun sync(ctx: Context) {
            val repo = (ctx.applicationContext as SystemApp).repository
            val focus = (repo.getSetting(FOCUS_UNTIL, "0").toLongOrNull() ?: 0L) > System.currentTimeMillis()
            val want = repo.profile() != null && (repo.getBool(Keys.LOCK_ON, false) || repo.getBool(Keys.POSTURE, true) || focus)
            val i = Intent(ctx, GuardService::class.java)
            if (want) runCatching { ContextCompat.startForegroundService(ctx, i) } else ctx.stopService(i)
        }
    }
}
