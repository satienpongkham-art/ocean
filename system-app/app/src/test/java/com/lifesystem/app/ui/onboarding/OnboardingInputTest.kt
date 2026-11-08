package com.lifesystem.app.ui.onboarding

import com.lifesystem.app.data.MeasureType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OnboardingInputTest {
    @Test fun minutes_parsesClockAndRejectsGarbage() {
        assertEquals(420, OnboardingInput.minutes("07:00"))
        assertEquals(1380, OnboardingInput.minutes("23.00"))
        assertEquals(360, OnboardingInput.minutes("6"))
        assertNull(OnboardingInput.minutes("25:00"))
        assertNull(OnboardingInput.minutes("abc"))
    }

    @Test fun toProfile_fallsBackToDefaults() {
        val p = OnboardingInput(name = "", age = "x", height = "", wake = "bad").toProfile(100)
        assertEquals("ผู้เล่น", p.name); assertEquals(25, p.age); assertEquals(420, p.wakeMin); assertEquals(100, p.day0EpochDay)
    }

    @Test fun day0_skipsBlankFields() {
        val m = OnboardingInput(weight = "90.5", waist = "", pushup = "12").day0().toMap()
        assertEquals(90.5, m[MeasureType.WEIGHT]!!, 1e-9); assertEquals(12.0, m[MeasureType.PUSHUP_MAX]!!, 1e-9); assertNull(m[MeasureType.WAIST])
    }
}
