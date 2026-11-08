package com.lifesystem.engine.sensors

import kotlin.math.abs
import kotlin.math.sqrt

sealed interface RepEvent {
    data class Rep(val count: Int) : RepEvent
    data class Invalid(val reason: String) : RepEvent
}

enum class Exercise { PUSHUP, SQUAT, ROPE }

enum class Availability { OK, UNSUPPORTED }

object CounterFactory {
    fun availability(exercise: Exercise, hasProximity: Boolean, hasAccel: Boolean): Availability = when (exercise) {
        Exercise.PUSHUP -> if (hasProximity && hasAccel) Availability.OK else Availability.UNSUPPORTED
        Exercise.SQUAT, Exercise.ROPE -> if (hasAccel) Availability.OK else Availability.UNSUPPORTED
    }
}

private const val GRAVITY = 9.81f

private fun magnitude(x: Float, y: Float, z: Float) = sqrt(x * x + y * y + z * z)

/**
 * Phone lies face-up under the chest. A rep = proximity near → far.
 * Anti-cheat: the phone must stay still on the floor (|‖a‖ − g| ≤ 2.5 m/s²) and reps are 0.6–6 s apart.
 */
class PushupCounter {
    var count = 0
        private set
    private var near = false
    private var nearStart = 0L
    private var lastRep: Long? = null
    private var maxDev = 0f

    fun onAccel(tMs: Long, x: Float, y: Float, z: Float): RepEvent? {
        if (near) maxDev = maxOf(maxDev, abs(magnitude(x, y, z) - GRAVITY))
        return null
    }

    fun onProximity(tMs: Long, isNear: Boolean): RepEvent? {
        if (isNear && !near) {
            near = true; nearStart = tMs; maxDev = 0f
            return null
        }
        if (!isNear && near) {
            near = false
            if (maxDev > MAX_DEVIATION) return RepEvent.Invalid("ยกมือถือ")
            val prev = lastRep
            lastRep = tMs
            if (tMs - nearStart > MAX_NEAR_MS) return null
            if (prev != null && tMs - prev < MIN_INTERVAL_MS) return null
            count++
            return RepEvent.Rep(count)
        }
        return null
    }

    private companion object {
        const val MAX_DEVIATION = 2.5f
        const val MAX_NEAR_MS = 6000L
        const val MIN_INTERVAL_MS = 600L
    }
}

/**
 * Phone in the front trouser pocket. Thigh angle from vertical: 0° standing, ~90° thigh parallel to floor.
 * A rep needs ≥ [downDeg]; a 40°…downDeg excursion is reported as too shallow.
 */
class SquatCounter(private val downDeg: Float = 70f) {
    var count = 0
        private set
    private var inRep = false
    private var maxAngle = 0f
    private var lastRep: Long? = null

    fun onThighAngle(tMs: Long, deg: Float): RepEvent? {
        if (!inRep) {
            if (deg >= STAND_DEG) { inRep = true; maxAngle = deg }
            return null
        }
        maxAngle = maxOf(maxAngle, deg)
        if (deg >= STAND_DEG) return null
        inRep = false
        if (maxAngle >= downDeg) {
            val prev = lastRep
            if (prev != null && tMs - prev < MIN_INTERVAL_MS) return null
            lastRep = tMs
            count++
            return RepEvent.Rep(count)
        }
        return if (maxAngle >= SHALLOW_DEG) RepEvent.Invalid("ลงไม่สุด") else null
    }

    private companion object {
        const val STAND_DEG = 25f
        const val SHALLOW_DEG = 40f
        const val MIN_INTERVAL_MS = 800L
    }
}

/**
 * Phone in a pocket; counts jump impacts from acceleration magnitude peaks.
 * Peaks must be 250–1000 ms apart (1–4 Hz); faster "shaking" never counts.
 * The first peak only arms the counter (counted from the second valid peak on).
 */
class JumpCounter {
    var count = 0
        private set
    private val window = ArrayDeque<Float>()
    private var prevValue = GRAVITY
    private var lastRawPeak: Long? = null

    fun onAccel(tMs: Long, x: Float, y: Float, z: Float): RepEvent? {
        val v = magnitude(x, y, z)
        val threshold = threshold()
        val rising = v > threshold && prevValue <= threshold
        prevValue = v
        window.addLast(v)
        if (window.size > WINDOW) window.removeFirst()
        if (!rising) return null
        val prev = lastRawPeak
        lastRawPeak = tMs
        if (prev == null) return null
        val dt = tMs - prev
        if (dt < MIN_INTERVAL_MS || dt > MAX_INTERVAL_MS) return null
        count++
        return RepEvent.Rep(count)
    }

    private fun threshold(): Float {
        if (window.isEmpty()) return FLOOR
        val mean = window.average().toFloat()
        val std = sqrt(window.sumOf { ((it - mean) * (it - mean)).toDouble() } / window.size).toFloat()
        return maxOf(FLOOR, mean + 0.6f * std)
    }

    private companion object {
        const val WINDOW = 100
        const val FLOOR = 12f
        const val MIN_INTERVAL_MS = 250L
        const val MAX_INTERVAL_MS = 1000L
    }
}
