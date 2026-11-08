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

    private var exercise: Exercise? = null
    private var onEvent: (RepEvent) -> Unit = {}
    private var pushup = PushupCounter()
    private var squat = SquatCounter()
    private var jump = JumpCounter()
    private var standing: FloatArray? = null

    override fun availability(exercise: Exercise) = CounterFactory.availability(exercise, proximity != null, accel != null)

    override fun start(exercise: Exercise, onEvent: (RepEvent) -> Unit) {
        stop()
        this.exercise = exercise
        this.onEvent = onEvent
        pushup = PushupCounter(); squat = SquatCounter(); jump = JumpCounter(); standing = null
        when (exercise) {
            Exercise.PUSHUP -> {
                sm.registerListener(this, proximity, SensorManager.SENSOR_DELAY_GAME)
                sm.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME)
            }
            Exercise.SQUAT -> sm.registerListener(this, gravity, SensorManager.SENSOR_DELAY_GAME)
            Exercise.ROPE -> sm.registerListener(this, accel, SensorManager.SENSOR_DELAY_FASTEST)
        }
    }

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
                val ref = standing ?: now.also { standing = it }
                squat.onThighAngle(t, thighAngleDeg(ref, now))
            }
            Exercise.ROPE -> jump.onAccel(t, e.values[0], e.values[1], e.values[2])
            null -> null
        }
        ev?.let(onEvent)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}
