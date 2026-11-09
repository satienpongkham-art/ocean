package com.lifesystem.app.ui

import com.lifesystem.app.ui.system.MsgLevel
import com.lifesystem.app.ui.system.SystemMessages
import com.lifesystem.app.ui.system.SystemState
import com.lifesystem.engine.model.Condition
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SystemMessagesTest {
    @Test fun urgentFirst_withRoutes() {
        val m = SystemMessages.build(SystemState(nowMin = 22 * 60, requiredLeft = 3, requiredTotal = 15, penaltyActive = true, openGate = "GATE 1" to 20, expScrolls = 1))
        assertEquals(MsgLevel.ALERT, m[0].level)
        assertTrue(m.take(2).all { it.level == MsgLevel.ALERT })
        assertEquals(MsgLevel.WARN, m.first { it.text.startsWith("เควสต์บังคับ") }.level) // under 3 h left
        assertEquals("gate", m.first { it.text.startsWith("GATE 1") }.route)
        assertEquals(MsgLevel.INFO, m.last().level)
    }

    @Test fun allDone_praise_andNoQuestNag() {
        val m = SystemMessages.build(SystemState(nowMin = 600, requiredLeft = 0, requiredTotal = 15, condition = Condition.OPTIMAL))
        assertTrue(m.any { it.text.contains("ครบแล้ว") })
        assertTrue(m.none { it.text.startsWith("เควสต์บังคับ") })
        assertTrue(m.any { it.text.contains("+10%") })
    }

    @Test fun stepsNag_onlyInEvening_mealOnlyWhenSoon() {
        assertTrue(SystemMessages.build(SystemState(nowMin = 600, requiredLeft = 1, requiredTotal = 2, steps = 1000 to 6000, nextMealMin = 900)).none { it.text.startsWith("ก้าว") || it.text.startsWith("มื้อ") })
        val evening = SystemMessages.build(SystemState(nowMin = 1110, requiredLeft = 1, requiredTotal = 2, steps = 1000 to 6000, nextMealMin = 1200))
        assertTrue(evening.any { it.text.startsWith("ก้าว") }); assertTrue(evening.any { it.text.startsWith("มื้อถัดไป 20:00") })
    }
}
