package com.lifesystem.app.popup

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PopupRulesTest {
    @Test fun wake_acceptedWithinAnHour() {
        assertTrue(PopupRules.wakeOnTime(nowMin = 420, wakeMin = 420))
        assertTrue(PopupRules.wakeOnTime(nowMin = 480, wakeMin = 420))
        assertFalse(PopupRules.wakeOnTime(nowMin = 481, wakeMin = 420))
    }

    @Test fun bed_windowIsAnHourBeforeToHalfHourAfter() {
        assertTrue(PopupRules.bedOnTime(nowMin = 1350, sleepMin = 1380))
        assertTrue(PopupRules.bedOnTime(nowMin = 1410, sleepMin = 1380))
        assertFalse(PopupRules.bedOnTime(nowMin = 1411, sleepMin = 1380))
        assertFalse(PopupRules.bedOnTime(nowMin = 1080, sleepMin = 1380))
    }

    @Test fun bed_crossesMidnight_creditsPreviousDay() {
        assertTrue(PopupRules.bedOnTime(nowMin = 10, sleepMin = 1430))
        assertEquals(99L, PopupRules.bedDay(today = 100, nowMin = 10, sleepMin = 1430))
        assertEquals(100L, PopupRules.bedDay(today = 100, nowMin = 1400, sleepMin = 1430))
    }
}
