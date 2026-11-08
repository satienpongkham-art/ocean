package com.lifesystem.engine.progression

import com.lifesystem.engine.model.Condition.FATIGUED
import com.lifesystem.engine.model.Condition.NORMAL
import com.lifesystem.engine.model.Condition.OPTIMAL
import com.lifesystem.engine.model.Metrics
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgressionTest {
    private fun m(
        weight: Double? = null, waist: Double? = null, pushup: Int? = null, plank: Int? = null,
        rope: Int? = null, sleep: Double? = null, prevWeight: Double? = null,
    ) = Metrics(weight, waist, pushup, plank, rope, sleep, prevWeight)

    @Test fun expNeeded_followsCurve() {
        assertEquals(500, Progression.expNeeded(1))
        assertEquals(650, Progression.expNeeded(2))
        assertEquals(1850, Progression.expNeeded(10))
    }

    @Test fun expCap_is150Percent() = assertEquals(750, Progression.expCap(1))

    @Test fun condition_fromSleep() {
        assertEquals(OPTIMAL, Progression.conditionFromSleep(7.5))
        assertEquals(NORMAL, Progression.conditionFromSleep(7.0))
        assertEquals(FATIGUED, Progression.conditionFromSleep(6.4))
        assertEquals(NORMAL, Progression.conditionFromSleep(null))
    }

    @Test fun multipliers() {
        assertEquals(0.7, Progression.conditionMultiplier(FATIGUED), 1e-9)
        assertEquals(1.0, Progression.conditionMultiplier(NORMAL), 1e-9)
        assertEquals(0.10, Progression.expBonus(OPTIMAL), 1e-9)
        assertEquals(0.0, Progression.expBonus(NORMAL), 1e-9)
    }

    @Test fun gate_passesOnWaistDrop() {
        val r = LevelGate.evaluate(1, 500, m(waist = 102.0), m(waist = 100.9))
        assertTrue(r is GateResult.Pass && "waist" in r.improved)
    }

    @Test fun gate_waistDropBelowNoise_noImprovement() {
        assertEquals(GateResult.NoImprovement, LevelGate.evaluate(1, 500, m(waist = 102.0), m(waist = 101.2)))
    }

    @Test fun gate_thresholds() {
        assertTrue(LevelGate.evaluate(1, 500, m(weight = 90.0), m(weight = 89.7)) is GateResult.Pass)
        assertTrue(LevelGate.evaluate(1, 500, m(pushup = 10), m(pushup = 11)) is GateResult.Pass)
        assertTrue(LevelGate.evaluate(1, 500, m(plank = 30), m(plank = 35)) is GateResult.Pass)
        assertTrue(LevelGate.evaluate(1, 500, m(rope = 60), m(rope = 70)) is GateResult.Pass)
        assertEquals(GateResult.NoImprovement, LevelGate.evaluate(1, 500, m(plank = 30), m(plank = 34)))
    }

    @Test fun gate_needsExp() {
        assertEquals(GateResult.NotEnoughExp(1), LevelGate.evaluate(1, 499, m(waist = 102.0), m(waist = 100.0)))
    }

    @Test fun gate_redFlag_fastWeightLoss() {
        val r = LevelGate.evaluate(1, 500, m(weight = 90.0), m(weight = 88.6, prevWeight = 90.0))
        assertTrue(r is GateResult.RedFlag)
    }

    @Test fun gate_redFlag_sleep() {
        val r = LevelGate.evaluate(1, 500, m(waist = 102.0), m(waist = 100.0, sleep = 5.9))
        assertTrue(r is GateResult.RedFlag)
    }

    @Test fun gate_ignoresMissingMetrics() {
        val r = LevelGate.evaluate(1, 500, m(pushup = 10), m(waist = 99.0, pushup = 11))
        assertTrue(r is GateResult.Pass && r.improved == listOf("pushup"))
    }
}
