package com.lifesystem.engine.sensors

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SitupCounterTest {
    private fun run(c: SitupCounter, angles: List<Float>, stepMs: Long = 100): List<RepEvent> {
        var t = 0L
        return angles.mapNotNull { a -> c.onTorsoAngle(t, a).also { t += stepMs } }
    }

    private val fullRep = listOf(5f, 30f, 65f, 70f, 40f, 10f, 5f)

    @Test fun fullSitups_count() {
        val c = SitupCounter()
        run(c, fullRep + fullRep + fullRep, stepMs = 200)
        assertEquals(3, c.count)
    }

    @Test fun halfSitup_isInvalid() {
        val c = SitupCounter()
        val ev = run(c, listOf(5f, 30f, 50f, 30f, 10f), stepMs = 200)
        assertEquals(0, c.count)
        assertTrue(ev.any { it is RepEvent.Invalid && it.reason == "ขึ้นไม่สุด" })
    }

    @Test fun tooFast_notCounted() {
        val c = SitupCounter()
        run(c, fullRep + fullRep, stepMs = 50)
        assertEquals(1, c.count)
    }
}
