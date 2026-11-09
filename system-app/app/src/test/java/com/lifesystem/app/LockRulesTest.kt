package com.lifesystem.app

import com.lifesystem.app.lock.LockInput
import com.lifesystem.app.lock.LockReason
import com.lifesystem.app.lock.LockRules
import com.lifesystem.app.lock.PostureMonitor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LockRulesTest {
    private fun input(pkg: String = "game", nowMin: Int = 480, morningDone: Boolean = false, trainingDone: Boolean = false, penalty: Boolean = false,
                      lockOn: Boolean = true, rest: Boolean = false, focusUntil: Long = 0, nowMs: Long = 1000) =
        LockInput(pkg, nowMs, nowMin, 420, 1080, lockOn, rest, morningDone, trainingDone, penalty, focusUntil, setOf("game", "social"), setOf("phone", "me"))

    @Test fun reasons() {
        assertEquals(LockReason.MORNING, LockRules.reason(input()))
        assertNull(LockRules.reason(input(morningDone = true)))
        assertEquals(LockReason.TRAINING, LockRules.reason(input(nowMin = 1100, morningDone = true)))
        assertNull(LockRules.reason(input(nowMin = 1100, morningDone = true, trainingDone = true)))
        assertEquals(LockReason.PENALTY, LockRules.reason(input(nowMin = 700, morningDone = true, penalty = true)))
        assertNull(LockRules.reason(input(pkg = "maps-not-listed", nowMin = 480)))
        assertNull(LockRules.reason(input(lockOn = false)))
        assertNull(LockRules.reason(input(rest = true)))
    }

    @Test fun focusLocksEverythingButNeverList() {
        assertEquals(LockReason.FOCUS, LockRules.reason(input(pkg = "browser", lockOn = false, focusUntil = 5000)))
        assertNull(LockRules.reason(input(pkg = "phone", focusUntil = 5000)))
        assertNull(LockRules.reason(input(pkg = "browser", lockOn = false, focusUntil = 500)))
    }

    @Test fun posture_15minRun_breakResets_cooldown() {
        val m = PostureMonitor()
        val min = 60_000L
        assertFalse((0L..14L).any { m.feed(it * min, true) })
        assertTrue(m.feed(15 * min, true))
        assertFalse(m.feed(16 * min, true)) // cooldown
        val m2 = PostureMonitor()
        (0L..10L).forEach { m2.feed(it * min, true) }
        m2.feed(10 * min + 30_000, false); m2.feed(12 * min, false) // > 1 min break
        assertFalse((12L..20L).any { m2.feed(it * min, true) })
        assertTrue(PostureMonitor.lookingDown(0f, 2f, 9.5f)); assertFalse(PostureMonitor.lookingDown(0f, 9.5f, 2f))
    }
}
