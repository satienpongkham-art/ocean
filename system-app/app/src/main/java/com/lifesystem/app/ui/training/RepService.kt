package com.lifesystem.app.ui.training

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import com.lifesystem.app.SystemApp
import com.lifesystem.app.schedule.AlarmReceiver
import com.lifesystem.engine.sensors.Exercise
import com.lifesystem.engine.sensors.RepEvent
import com.lifesystem.engine.training.TrainingProgram
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class RepState(
    val running: Boolean = false,
    val questId: String? = null,
    val reps: Int = 0,
    val lastInvalid: String? = null,
)

/** Counts reps with the screen off (phone in a pocket) and writes progress straight to the quest. */
class RepService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var source: AndroidSensorSource? = null
    private var tone: ToneGenerator? = null
    private var lastJumpMs: Long? = null
    private var ropeActiveMs = 0L
    private var ropeCredited = 0
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val questId = intent?.getStringExtra(EXTRA_QUEST) ?: return START_NOT_STICKY.also { stopSelf() }
        val epochDay = intent.getLongExtra(EXTRA_DAY, SystemApp.today())
        val exercise = Exercise.valueOf(intent.getStringExtra(EXTRA_EXERCISE) ?: Exercise.PUSHUP.name)
        goForeground()
        // A new start replaces any running session: release the old sensors and tone first.
        source?.stop(); source = null
        tone?.release()
        lastJumpMs = null; ropeActiveMs = 0L; ropeCredited = 0; walkSteps = 0
        // Keep the CPU awake while counting with the screen off (phone in a pocket).
        if (wakeLock?.isHeld != true) {
            wakeLock = getSystemService(PowerManager::class.java)
                .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "system:reps")
                .apply { acquire(MAX_SESSION_MS) }
        }
        tone = runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 60) }.getOrNull()
        _state.value = RepState(running = true, questId = questId)
        val repo = (application as SystemApp).repository
        source = AndroidSensorSource(this).also { src ->
            src.start(exercise) { ev ->
                when (ev) {
                    is RepEvent.Rep -> {
                        val credit = when (exercise) {
                            Exercise.ROPE -> ropeSeconds()
                            Exercise.WALK -> walkSessions()
                            else -> 1
                        }
                        _state.value = _state.value.copy(reps = _state.value.reps + 1, lastInvalid = null)
                        feedback()
                        if (credit > 0) scope.launch {
                            repo.addProgress(epochDay, questId, credit)
                            // Target reached: stop sensors and the foreground service on our own.
                            if (repo.quest(epochDay, questId)?.done == true) stopSelf()
                        }
                    }
                    is RepEvent.Invalid -> _state.value = _state.value.copy(lastInvalid = ev.reason)
                }
            }
        }
        return START_NOT_STICKY
    }

    private var walkSteps = 0

    /** One "walk after a meal" session per [TrainingProgram.WALK_SESSION_STEPS] steps. */
    private fun walkSessions(): Int {
        walkSteps++
        return if (walkSteps % TrainingProgram.WALK_SESSION_STEPS == 0) 1 else 0
    }

    /** Rope progress is in seconds: count time between jumps that are ≤ 1.5 s apart. */
    private fun ropeSeconds(): Int {
        val now = System.currentTimeMillis()
        lastJumpMs?.let { if (now - it <= 1500) ropeActiveMs += now - it }
        lastJumpMs = now
        val whole = (ropeActiveMs / 1000).toInt()
        val add = whole - ropeCredited
        ropeCredited = whole
        return add
    }

    private fun feedback() {
        tone?.startTone(ToneGenerator.TONE_PROP_BEEP, 60)
        val v = getSystemService(Vibrator::class.java)
        runCatching { v?.vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE)) }
    }

    private fun goForeground() {
        AlarmReceiver.ensureChannel(this)
        val n: Notification = NotificationCompat.Builder(this, AlarmReceiver.CHANNEL)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("[ TRAINING ] SENSOR LIVE")
            .setContentText("System กำลังนับครั้ง")
            .setOngoing(true)
            .setSilent(true)
            .build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        else startForeground(NOTIF_ID, n)
    }

    override fun onDestroy() {
        source?.stop()
        tone?.release()
        wakeLock?.takeIf { it.isHeld }?.release()
        _state.value = _state.value.copy(running = false)
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val EXTRA_QUEST = "quest"
        private const val EXTRA_DAY = "day"
        private const val EXTRA_EXERCISE = "exercise"
        private const val NOTIF_ID = 4242
        private const val MAX_SESSION_MS = 30 * 60 * 1000L
        private val _state = MutableStateFlow(RepState())
        val state: StateFlow<RepState> = _state

        fun start(context: Context, epochDay: Long, questId: String, exercise: Exercise) {
            val i = Intent(context, RepService::class.java)
                .putExtra(EXTRA_QUEST, questId).putExtra(EXTRA_DAY, epochDay).putExtra(EXTRA_EXERCISE, exercise.name)
            context.startForegroundService(i)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, RepService::class.java))
        }

        fun exerciseFor(questId: String): Exercise = when {
            questId.contains("squat") -> Exercise.SQUAT
            questId.contains("situp") -> Exercise.SITUP
            questId.contains("rope") -> Exercise.ROPE
            questId.contains("walk") -> Exercise.WALK
            else -> Exercise.PUSHUP
        }
    }
}
