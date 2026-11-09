package com.lifesystem.app.ui

import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.ui.quest.QuestWindows
import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.model.Inventory
import com.lifesystem.engine.quest.BoardGenerator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class QuestWindowsTest {
    private fun board(penalty: Boolean = false, boss: Boolean = false) =
        BoardGenerator.generate(3, Condition.NORMAL, Inventory(true, true, false), listOf("shave"), penalty, boss).map { QuestEntity.from(100, it) }

    @Test fun everyQuestLandsInExactlyOneWindow() {
        val b = board(penalty = true, boss = true)
        val placed = QuestWindows.group(b, 600).flatMap { it.quests }
        assertEquals(b.map { it.questId }.sorted(), placed.map { it.questId }.sorted())
    }

    @Test fun order_penaltyFirst_sideLast_categoriesBetween() {
        val keys = QuestWindows.group(board(penalty = true, boss = true), 600).map { it.key }
        assertEquals("PENALTY", keys.first()); assertEquals("SIDE", keys.last())
        assertTrue(keys.containsAll(listOf("BOSS", "BODY", "HEALTH", "LOOK", "MIND", "WISDOM")))
    }

    @Test fun closedGatesDisappear() {
        val gate = QuestEntity(100, "gate1_pushup", "GATE", "STR", "GATE", "TRAINING", "SENSOR", 20, "ครั้ง", 15, 8, openMin = 600, closeMin = 645)
        assertTrue(QuestWindows.group(listOf(gate), 620).any { it.key == "GATE" })
        assertTrue(QuestWindows.group(listOf(gate), 650).none { it.key == "GATE" })
    }
}
