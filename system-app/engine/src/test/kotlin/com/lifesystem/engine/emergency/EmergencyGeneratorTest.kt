package com.lifesystem.engine.emergency

import com.lifesystem.engine.model.QuestType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate

class EmergencyGeneratorTest {
    private fun gen(d: Long) = EmergencyGenerator.generate(d, wakeMin = 420, sleepMin = 1380)

    @Test fun aboutFortyPercentOfDays_deterministic_neverSunday() {
        val days = (20_000L until 21_000L)
        val hits = days.count { gen(it) != null }
        assertEquals(0.4 * 6 / 7, hits / 1000.0, 0.06)
        days.forEach { assertEquals(gen(it), gen(it)) }
        days.filter { LocalDate.ofEpochDay(it).dayOfWeek == DayOfWeek.SUNDAY }.forEach { assertNull(gen(it)) }
    }

    @Test fun window_60to120min_insideWakingHours_coreType() {
        (20_000L until 20_400L).mapNotNull { gen(it) }.forEach { q ->
            val len = q.closeMin!! - q.openMin!!
            assertTrue(len in 60..120)
            assertTrue(q.openMin!! >= 420 + 60 && q.closeMin!! <= 1380 - 120)
            assertEquals(QuestType.EMERGENCY, q.type)
            assertTrue(q.core); assertTrue(q.id.startsWith("emg_")); assertEquals(20, q.gold)
        }
    }
}
