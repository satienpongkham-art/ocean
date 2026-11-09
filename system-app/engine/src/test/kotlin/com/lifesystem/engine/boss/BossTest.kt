package com.lifesystem.engine.boss

import com.lifesystem.engine.model.Metrics
import com.lifesystem.engine.progression.GateResult
import com.lifesystem.engine.progression.Progression
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class BossTest {
    private fun m(waist: Double? = 96.0, push: Int? = 10, plank: Int? = 30) = Metrics(null, waist, push, plank, null, null, null)

    @Test fun sundayIsBossDay() {
        assertTrue(Boss.isBossDay(LocalDate.of(2026, 11, 8).toEpochDay()))
        assertFalse(Boss.isBossDay(LocalDate.of(2026, 11, 9).toEpochDay()))
    }

    @Test fun twoImprovements_withEnoughExp_defeatsBoss() {
        val o = Boss.fight(1, 600, best = m(), now = m(waist = 94.5, push = 12))
        assertEquals(70, o.damage); assertEquals(0, o.hpLeft); assertTrue(o.defeated)
        assertTrue(o.result is GateResult.Pass)
    }

    @Test fun improvement_butNotEnoughExp_damagesOnly() {
        val o = Boss.fight(1, 100, best = m(), now = m(push = 12))
        assertEquals(35, o.damage); assertEquals(65, o.hpLeft); assertFalse(o.defeated)
    }

    @Test fun noImprovement_noDamage() {
        val o = Boss.fight(1, 600, best = m(), now = m())
        assertEquals(0, o.damage); assertEquals(100, o.hpLeft); assertFalse(o.defeated)
    }

    @Test fun levelUp_carriesExpOver() {
        assertEquals(2 to 100, Boss.levelUp(1, Progression.expNeeded(1) + 100))
    }
}
