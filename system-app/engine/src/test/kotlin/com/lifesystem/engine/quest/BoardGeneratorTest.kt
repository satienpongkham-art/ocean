package com.lifesystem.engine.quest

import com.lifesystem.engine.model.Condition.FATIGUED
import com.lifesystem.engine.model.Condition.NORMAL
import com.lifesystem.engine.model.Inventory
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Verify
import com.lifesystem.engine.training.TrainingProgram
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BoardGeneratorTest {
    private fun inv(sunscreen: Boolean = true) = Inventory(hasSunscreen = sunscreen, hasTapeMeasure = true, hasArmband = false)
    private fun board(day: Int = 1, sunscreen: Boolean = true, due: List<String> = emptyList(), penalty: Boolean = false, cond: com.lifesystem.engine.model.Condition = NORMAL) =
        BoardGenerator.generate(day, cond, inv(sunscreen), due, penalty)

    @Test fun day1_containsSpecMainQuests() {
        val ids = board().filter { it.type == QuestType.DAILY_MAIN }.map { it.id }
        assertTrue(ids.containsAll(listOf("wake", "weigh", "skincare", "no_soda", "read", "english", "pushup", "squat", "journal", "sleep")))
    }

    @Test fun day1_pushupTarget10_squat20() {
        val b = board()
        assertEquals(10, b.first { it.id == "pushup" }.target)
        assertEquals(20, b.first { it.id == "squat" }.target)
        assertEquals(Verify.SENSOR, b.first { it.id == "pushup" }.verify)
    }

    @Test fun fatigued_scalesTraining() = assertEquals(7, board(cond = FATIGUED).first { it.id == "pushup" }.target)

    @Test fun noSunscreen_addsChainBuyQuest() {
        val b = board(sunscreen = false)
        val chain = b.first { it.id == "buy_sunscreen" }
        assertEquals(QuestType.CHAIN, chain.type)
        assertTrue(chain.title.contains("SPF 30"))
        assertFalse(b.any { it.id == "skincare" })
    }

    @Test fun maintenanceDue_addsMaintenanceQuests() {
        val q = board(due = listOf("nails_hand")).first { it.id == "mt_nails_hand" }
        assertEquals(QuestType.MAINTENANCE, q.type)
    }

    @Test fun penaltyPending_addsPenaltyQuest() {
        val q = board(day = 3, penalty = true).first { it.id == "penalty" }
        assertEquals(QuestType.PENALTY, q.type)
        assertEquals(Verify.SENSOR, q.verify)
        assertEquals(TrainingProgram.pushupTotal(3) / 2, q.target)
    }

    @Test fun rewards() {
        val b = board()
        b.filter { it.type == QuestType.DAILY_MAIN }.forEach { assertEquals(4, it.gold); assertTrue(it.exp in 20..40) }
        b.filter { it.type == QuestType.DAILY_SIDE }.forEach { assertTrue(it.gold in 0..2); assertTrue(it.exp in 10..20) }
    }

    @Test fun sameInputs_sameBoard() = assertEquals(board(day = 3), board(day = 3))

    @Test fun idsAreUnique() = board(sunscreen = false, due = listOf("haircut"), penalty = true).map { it.id }.let { assertEquals(it.size, it.toSet().size) }

    @Test fun maintenance_cappedPerDay() {
        val all = listOf("shave", "nails_hand", "nails_foot", "haircut", "dental")
        val mt = board(due = all).filter { it.type == QuestType.MAINTENANCE }.map { it.id }
        assertEquals(listOf("mt_shave", "mt_nails_hand"), mt)
        assertEquals(2, BoardGenerator.MAX_MAINTENANCE_PER_DAY)
    }
}
