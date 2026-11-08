package com.lifesystem.engine.training

import com.lifesystem.engine.model.Condition.FATIGUED
import com.lifesystem.engine.model.Condition.NORMAL
import com.lifesystem.engine.training.TrainingProgram.englishMinutes
import com.lifesystem.engine.training.TrainingProgram.pushupTotal
import com.lifesystem.engine.training.TrainingProgram.readingPages
import com.lifesystem.engine.training.TrainingProgram.ropeSeconds
import com.lifesystem.engine.training.TrainingProgram.scaled
import com.lifesystem.engine.training.TrainingProgram.sets
import com.lifesystem.engine.training.TrainingProgram.squatTotal
import com.lifesystem.engine.training.TrainingProgram.zone2WeeklyMinutes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainingProgramTest {
    @Test fun pushup_day1_is10_day30_is100() {
        assertEquals(10, pushupTotal(1)); assertEquals(100, pushupTotal(30))
    }

    @Test fun pushup_deloadEvery5thDay() {
        assertTrue(pushupTotal(5) < pushupTotal(4)); assertTrue(pushupTotal(6) > pushupTotal(4))
    }

    @Test fun pushup_afterDay30_holds100() = assertEquals(100, pushupTotal(45))

    @Test fun pushup_neverBelowDay1() = assertEquals(10, pushupTotal(0))

    @Test fun squat_isDoublePushupCapped150() {
        assertEquals(20, squatTotal(1)); assertEquals(150, squatTotal(30))
    }

    @Test fun rope() {
        assertEquals(90, ropeSeconds(1)); assertEquals(600, ropeSeconds(200))
    }

    @Test fun scaled_fatigued_rounded() {
        assertEquals(7, scaled(10, FATIGUED)); assertEquals(10, scaled(10, NORMAL))
    }

    @Test fun sets_split() {
        assertEquals(listOf(5, 5), sets(10, 6))
        assertEquals(listOf(20, 20, 20, 20, 20), sets(100, 20))
        assertEquals(listOf(4, 3), sets(7, 6))
        assertEquals(emptyList<Int>(), sets(0, 6))
    }

    @Test fun zone2() = assertEquals(listOf(60, 80, 100, 120, 140, 150, 150), (1..7).map { zone2WeeklyMinutes(it) })

    @Test fun learning() {
        assertEquals(5, readingPages(1)); assertEquals(20, readingPages(60))
        assertEquals(15, englishMinutes(1)); assertEquals(30, englishMinutes(60))
    }
}
