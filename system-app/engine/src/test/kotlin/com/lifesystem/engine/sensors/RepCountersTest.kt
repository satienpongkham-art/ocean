package com.lifesystem.engine.sensors

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class RepCountersTest {
    private val g = 9.81f

    /** Push-up trace: near for [nearMs], far for the rest of [periodMs]; accel sampled every 50 ms. */
    private fun pushupTrace(c: PushupCounter, cycles: Int, periodMs: Long, nearMs: Long, liftDuringCycle: Int = -1): List<RepEvent> {
        val events = mutableListOf<RepEvent>()
        var t = 0L
        repeat(cycles) { i ->
            c.onProximity(t, true)?.let(events::add)
            var s = t
            while (s < t + nearMs) {
                val z = if (i == liftDuringCycle) g + 4f else g
                c.onAccel(s, 0f, 0f, z)?.let(events::add); s += 50
            }
            c.onProximity(t + nearMs, false)?.let(events::add)
            t += periodMs
        }
        return events
    }

    @Test fun pushup_nearFarCycles_count() {
        val c = PushupCounter()
        pushupTrace(c, cycles = 5, periodMs = 1300, nearMs = 400)
        assertEquals(5, c.count)
    }

    @Test fun pushup_tooFastBounce_notCounted() {
        val c = PushupCounter()
        pushupTrace(c, cycles = 5, periodMs = 300, nearMs = 100)
        assertTrue(c.count <= 1)
    }

    @Test fun pushup_liftedPhone_isInvalid() {
        val c = PushupCounter()
        val events = pushupTrace(c, cycles = 3, periodMs = 1300, nearMs = 400, liftDuringCycle = 1)
        assertEquals(2, c.count)
        assertTrue(events.any { it is RepEvent.Invalid && it.reason == "ยกมือถือ" })
    }

    private fun squatTrace(c: SquatCounter, reps: Int, peakDeg: Float): List<RepEvent> {
        val events = mutableListOf<RepEvent>()
        var t = 0L
        repeat(reps) {
            for (step in 0..40) {
                val phase = step / 40f
                val deg = peakDeg * (1 - abs(2 * phase - 1))
                c.onThighAngle(t, deg)?.let(events::add); t += 50
            }
        }
        return events
    }

    @Test fun squat_fullDepth_counts() {
        val c = SquatCounter()
        squatTrace(c, reps = 3, peakDeg = 80f)
        assertEquals(3, c.count)
    }

    @Test fun squat_halfDepth_invalid() {
        val c = SquatCounter()
        val events = squatTrace(c, reps = 1, peakDeg = 50f)
        assertEquals(0, c.count)
        assertTrue(events.any { it is RepEvent.Invalid && it.reason == "ลงไม่สุด" })
    }

    private fun jumpTrace(c: JumpCounter, hz: Double, seconds: Int) {
        val period = (1000 / hz).toLong()
        var t = 0L
        while (t < seconds * 1000L) {
            val inPulse = (t % period) < 40
            c.onAccel(t, 0f, 0f, if (inPulse) 15f else g); t += 10
        }
    }

    @Test fun jump_rhythm_counts() {
        val c = JumpCounter()
        jumpTrace(c, hz = 2.0, seconds = 10)
        assertTrue("count=${c.count}", abs(c.count - 20) <= 1)
    }

    @Test fun jump_shakeTooFast_notCounted() {
        val c = JumpCounter()
        jumpTrace(c, hz = 8.0, seconds = 5)
        assertEquals(0, c.count)
    }

    @Test fun jump_flatSignal_notCounted() {
        val c = JumpCounter()
        var t = 0L
        repeat(1000) { c.onAccel(t, 0f, 0f, g); t += 10 }
        assertEquals(0, c.count)
    }

    @Test fun availability() {
        assertEquals(Availability.UNSUPPORTED, CounterFactory.availability(Exercise.PUSHUP, hasProximity = false, hasAccel = true))
        assertEquals(Availability.OK, CounterFactory.availability(Exercise.SQUAT, hasProximity = false, hasAccel = true))
        assertEquals(Availability.UNSUPPORTED, CounterFactory.availability(Exercise.ROPE, hasProximity = true, hasAccel = false))
    }
}
