package com.lifesystem.engine.quest

import com.lifesystem.engine.model.Condition.NORMAL
import com.lifesystem.engine.model.Inventory
import com.lifesystem.engine.model.QuestType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DayCloserTest {
    private val quests = BoardGenerator.generate(1, NORMAL, Inventory(true, true, false), emptyList(), false)
    private val mains = quests.filter { it.type == QuestType.DAILY_MAIN }
    private fun allDone() = quests.associate { it.id to it.target }

    @Test fun close_allMainDone_givesFullClearBonus() {
        val r = DayCloser.close(quests, allDone())
        assertEquals(mains.size, r.mainDone)
        assertEquals(mains.size, r.mainTotal)
        assertFalse(r.penaltyTomorrow)
        assertEquals(quests.sumOf { it.gold } + BoardGenerator.FULL_CLEAR_GOLD, r.goldEarned)
        assertEquals(quests.sumOf { it.exp }, r.expEarned)
    }

    @Test fun close_missingMain_setsPenalty() {
        val r = DayCloser.close(quests, allDone() - "journal")
        assertTrue(r.penaltyTomorrow)
        assertTrue("journal" in r.failed)
    }

    @Test fun close_partialProgressCountsAsNotDone() {
        val r = DayCloser.close(quests, allDone() + ("pushup" to 9))
        assertTrue("pushup" in r.failed)
        assertTrue(r.penaltyTomorrow)
    }

    @Test fun close_sideQuestMissing_noPenalty() {
        val side = quests.first { it.type == QuestType.DAILY_SIDE }
        val r = DayCloser.close(quests, allDone() - side.id)
        assertFalse(r.penaltyTomorrow)
    }

    @Test fun close_graceDay_rewardsButNoPenalty() {
        val r = DayCloser.close(quests, allDone() - "journal", graceDay = true)
        assertFalse(r.penaltyTomorrow)
        assertTrue("journal" in r.failed)
    }
}
