package com.lifesystem.app.lock

import android.accessibilityservice.AccessibilityService
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.view.accessibility.AccessibilityEvent
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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalTime

/** Hard-mode app lock + posture reminder. Runs only while the user keeps it enabled in Accessibility settings. */
class LockService : AccessibilityService(), SensorEventListener {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val posture = PostureMonitor()
    private var never: Set<String> = emptySet()
    private var lastLockedPkg: String? = null
    private var lastLockMs = 0L

    private val screen = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) = if (i.action == Intent.ACTION_SCREEN_ON) startPosture() else stopPosture()
    }

    override fun onServiceConnected() {
        never = LockRules.neverLock(this)
        ContextCompat.registerReceiver(this, screen, IntentFilter().apply { addAction(Intent.ACTION_SCREEN_ON); addAction(Intent.ACTION_SCREEN_OFF) }, ContextCompat.RECEIVER_NOT_EXPORTED)
        startPosture()
    }

    override fun onAccessibilityEvent(e: AccessibilityEvent?) {
        if (e?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = e.packageName?.toString() ?: return
        if (pkg in never) return
        scope.launch { decide(pkg) }
    }

    private suspend fun decide(pkg: String) {
        val app = application as SystemApp
        val repo = app.repository
        val p = repo.profile() ?: return
        val today = SystemApp.today()
        val board = repo.board(today).first()
        fun done(id: String) = board.firstOrNull { it.questId == id }?.done ?: true
        val now = LocalTime.now().let { it.hour * 60 + it.minute }
        val reason = LockRules.reason(LockInput(
            pkg = pkg, nowMs = System.currentTimeMillis(), nowMin = now, wakeMin = p.wakeMin,
            trainingFromMin = repo.getInt(Keys.LOCK_TRAINING_FROM, 18 * 60), lockOn = repo.getBool(Keys.LOCK_ON, false),
            rest = repo.dao.day(today)?.rest == true, morningDone = done("wake") && done("weigh"), trainingDone = done("pushup") && done("squat"),
            penaltyPending = board.any { it.type == QuestType.PENALTY.name && !it.done },
            focusUntilMs = repo.getSetting(FOCUS_UNTIL, "0").toLongOrNull() ?: 0L,
            lockApps = repo.getSetting(Keys.LOCK_APPS, "").split(',').filter { it.isNotBlank() }.toSet(), never = never,
        )) ?: return
        // Do not stack lock screens when the same app re-sends events.
        if (pkg == lastLockedPkg && System.currentTimeMillis() - lastLockMs < 1500) return
        lastLockedPkg = pkg; lastLockMs = System.currentTimeMillis()
        startActivity(Intent(this, LockActivity::class.java).putExtra(LockActivity.EXTRA_REASON, reason.name)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION))
    }

    // ---- posture ----
    private fun startPosture() {
        scope.launch {
            if (!(application as SystemApp).repository.getBool(Keys.POSTURE, true)) return@launch
            val sm = getSystemService(SensorManager::class.java)
            val g = sm.getDefaultSensor(Sensor.TYPE_GRAVITY) ?: sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return@launch
            sm.registerListener(this@LockService, g, 5_000_000) // one sample every ~5 s is enough
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
    override fun onInterrupt() = Unit

    override fun onDestroy() {
        runCatching { unregisterReceiver(screen) }
        stopPosture()
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val FOCUS_UNTIL = "focus_until"
    }
}
