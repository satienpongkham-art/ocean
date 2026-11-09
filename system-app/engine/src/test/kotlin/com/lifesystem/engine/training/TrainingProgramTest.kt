package com.lifesystem.engine.training

import com.lifesystem.engine.model.Condition.FATIGUED
import com.lifesystem.engine.model.Condition.NORMAL
import com.lifesystem.engine.training.TrainingProgram.englishMinutes
import com.lifesystem.engine.training.TrainingProgram.pushupTotal
import com.lifesystem.engine.training.TrainingProgram.readingPages
import com.lifesystem.engine.training.TrainingProgram.ropeSeconds
import com.lifesystem.engine.training.TrainingProgram.scaled
import com.lifesystem.engine.training.TrainingProgram.sets
import com.lifesystem.engine.training.TrainingProgram.situpTotal
import com.lifesystem.engine.training.TrainingProgram.squatTotal
import com.lifesystem.engine.training.TrainingProgram.stepsTarget
import com.lifesystem.engine.training.TrainingProgram.zone2WeeklyMinutes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainingProgramTest {
    @Test fun pushup_ramps_50_100_200() {
        assertEquals(50, pushupTotal(1)); assertEquals(100, pushupTotal(14)); assertEquals(200, pushupTotal(61))
        assertEquals(96, pushupTotal(13))
    }

    @Test fun pushup_deloadEvery5thDay() {
        assertTrue(pushupTotal(5) < pushupTotal(4)); assertTrue(pushupTotal(6) > pushupTotal(4))
        assertEquals(140, pushupTotal(60))
    }

    @Test fun pushup_neverBelowDay1() = assertEquals(50, pushupTotal(0))

    @Test fun squat_ramps_100_150_200() {
        assertEquals(100, squatTotal(1)); assertEquals(150, squatTotal(14)); assertEquals(200, squatTotal(61))
    }

    @Test fun situp_ramps_50_100_200() {
        assertEquals(50, situpTotal(1)); assertEquals(100, situpTotal(14)); assertEquals(200, situpTotal(61))
    }

    @Test fun rope_180_300_600_noDeload() {
        assertEquals(180, ropeSeconds(1)); assertEquals(300, ropeSeconds(14)); assertEquals(600, ropeSeconds(60))
    }

    @Test fun steps_6000_7000_8000() {
        assertEquals(6000, stepsTarget(1)); assertEquals(7000, stepsTarget(14)); assertEquals(8000, stepsTarget(28)); assertEquals(8000, stepsTarget(90))
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

    @Test fun plank_60_90_180() {
        assertEquals(60, TrainingProgram.plankSeconds(1)); assertEquals(90, TrainingProgram.plankSeconds(14)); assertEquals(180, TrainingProgram.plankSeconds(60))
    }

    @Test fun dumbbellReps_10_to_15_over_6_weeks() {
        assertEquals(10, TrainingProgram.dumbbellReps(1)); assertEquals(15, TrainingProgram.dumbbellReps(42)); assertEquals(15, TrainingProgram.dumbbellReps(90))
    }
}
