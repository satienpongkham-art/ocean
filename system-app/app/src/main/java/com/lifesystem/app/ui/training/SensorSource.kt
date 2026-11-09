package com.lifesystem.app.ui.training

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.lifesystem.engine.sensors.Availability
import com.lifesystem.engine.sensors.CounterFactory
import com.lifesystem.engine.sensors.Exercise
import com.lifesystem.engine.sensors.JumpCounter
import com.lifesystem.engine.sensors.PushupCounter
import com.lifesystem.engine.sensors.RepEvent
import com.lifesystem.engine.sensors.SitupCounter
import com.lifesystem.engine.sensors.SquatCounter
import kotlin.math.acos
import kotlin.math.sqrt

/**
 * Angle in degrees between the gravity vector captured while standing ([standing]) and now ([now]).
 * Calibrating per set makes it work whichever way the phone sits in the pocket.
 */
fun thighAngleDeg(standing: FloatArray, now: FloatArray): Float {
    val a = sqrt(standing[0] * standing[0] + standing[1] * standing[1] + standing[2] * standing[2])
    val b = sqrt(now[0] * now[0] + now[1] * now[1] + now[2] * now[2])
    if (a < 1e-3f || b < 1e-3f) return 0f
    val dot = (standing[0] * now[0] + standing[1] * now[1] + standing[2] * now[2]) / (a * b)
    return Math.toDegrees(acos(dot.coerceIn(-1f, 1f).toDouble())).toFloat()
}

interface SensorSource {
    fun availability(exercise: Exercise): Availability
    fun start(exercise: Exercise, onEvent: (RepEvent) -> Unit)
    fun stop()
}

/** Feeds Android sensors into the engine counters. */
class AndroidSensorSource(context: Context) : SensorSource, SensorEventListener {
    private val sm = context.getSystemService(SensorManager::class.java)
    private val proximity = sm.getDefaultSensor(Sensor.TYPE_PROXIMITY)
    private val accel = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private val gravity = sm.getDefaultSensor(Sensor.TYPE_GRAVITY) ?: accel
    private val stepDetector = sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)

    private var exercise: Exercise? = null
    private var onEvent: (RepEvent) -> Unit = {}
    private var pushup = PushupCounter()
    private var squat = SquatCounter()
    private var situp = SitupCounter()
    private var steps = 0
    private var jump = JumpCounter()
    private var standing: FloatArray? = null

    override fun availability(exercise: Exercise) = CounterFactory.availability(exercise, proximity != null, accel != null)

    override fun start(exercise: Exercise, onEvent: (RepEvent) -> Unit) {
        stop()
        this.exercise = exercise
        this.onEvent = onEvent
        pushup = PushupCounter(); squat = SquatCounter(); situp = SitupCounter(); jump = JumpCounter(); steps = 0
        standing = null; calibrator = StandingCalibrator()
        when (exercise) {
            Exercise.PUSHUP -> {
                sm.registerListener(this, proximity, SensorManager.SENSOR_DELAY_GAME)
                sm.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME)
            }
            Exercise.SQUAT, Exercise.SITUP -> sm.registerListener(this, gravity, SensorManager.SENSOR_DELAY_GAME)
            Exercise.ROPE -> sm.registerListener(this, accel, SensorManager.SENSOR_DELAY_FASTEST)
            // Step detector when present (needs activity recognition permission); otherwise accelerometer peaks.
            Exercise.WALK -> sm.registerListener(this, stepDetector ?: accel, SensorManager.SENSOR_DELAY_GAME)
        }
    }

    private var calibrator = StandingCalibrator()

    override fun stop() {
        sm.unregisterListener(this)
        exercise = null
    }

    override fun onSensorChanged(e: SensorEvent) {
        val t = e.timestamp / 1_000_000
        val ev: RepEvent? = when (exercise) {
            Exercise.PUSHUP -> when (e.sensor.type) {
                Sensor.TYPE_PROXIMITY -> pushup.onProximity(t, e.values[0] < minOf(e.sensor.maximumRange, 5f))
                else -> pushup.onAccel(t, e.values[0], e.values[1], e.values[2])
            }
            Exercise.SQUAT -> {
                val now = e.values.copyOf(3)
                val ref = standing ?: calibrator.offer(t, now)?.also { standing = it }
                if (ref != null) squat.onThighAngle(t, thighAngleDeg(ref, now)) else null
            }
            Exercise.SITUP -> {
                // Lying on the back, phone flat on the chest: the reference is the still lying pose.
                val now = e.values.copyOf(3)
                val ref = standing ?: calibrator.offer(t, now)?.also { standing = it }
                if (ref != null) situp.onTorsoAngle(t, thighAngleDeg(ref, now)) else null
            }
            Exercise.ROPE -> jump.onAccel(t, e.values[0], e.values[1], e.values[2])
            Exercise.WALK -> if (e.sensor.type == Sensor.TYPE_STEP_DETECTOR) RepEvent.Rep(++steps)
                else jump.onAccel(t, e.values[0], e.values[1], e.values[2])
            null -> null
        }
        ev?.let(onEvent)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}

/**
 * Squat reference pose: ignores the first [settleMs] (moving the phone into the pocket),
 * then takes the mean gravity once the phone has been still for [stillMs].
 */
class StandingCalibrator(
    private val settleMs: Long = 3000,
    private val stillMs: Long = 1000,
    private val tolerance: Float = 0.6f,
) {
    private var startMs: Long? = null
    private val window = ArrayDeque<Pair<Long, FloatArray>>()

    fun offer(tMs: Long, gravity: FloatArray): FloatArray? {
        val start = startMs ?: tMs.also { startMs = it }
        window.addLast(tMs to gravity.copyOf(3))
        while (window.first().first < tMs - stillMs) window.removeFirst()
        if (tMs - start < settleMs || tMs - window.first().first < stillMs - 100) return null
        for (axis in 0..2) {
            val values = window.map { it.second[axis] }
            if (values.max() - values.min() > tolerance) return null
        }
        return FloatArray(3) { axis -> window.map { it.second[axis] }.average().toFloat() }
    }
}
