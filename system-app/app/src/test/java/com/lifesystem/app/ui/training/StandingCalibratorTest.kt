package com.lifesystem.app.ui.training

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class StandingCalibratorTest {
    private val still = floatArrayOf(0f, 9.8f, 0f)

    @Test fun waitsForSettleTime_evenIfStill() {
        val c = StandingCalibrator()
        for (t in 0L..2900L step 20) assertNull(c.offer(t, still))
    }

    @Test fun ignoresMovementWhilePocketing_thenLocksOnStillPhone() {
        val c = StandingCalibrator()
        // 0–3.5 s: hand → pocket, phone swinging
        for (t in 0L..3500L step 20) assertNull(c.offer(t, floatArrayOf((t % 200) / 40f, 8f, 3f)))
        // then standing still in the pocket, tilted
        val pocket = floatArrayOf(1.5f, 9.6f, 1.0f)
        var ref: FloatArray? = null
        var t = 3520L
        while (ref == null && t < 6000) { ref = c.offer(t, pocket); t += 20 }
        assertNotNull(ref)
        assertArrayEquals(pocket, ref, 1e-4f)
        check(t in 4400L..4700L) { "locked at $t" }
    }
}
