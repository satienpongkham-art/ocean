package com.lifesystem.engine.achievements

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AchievementsTest {
    private fun h(days: List<Set<String>> = emptyList(), full: List<Boolean> = emptyList(), reps: Map<String, Int> = emptyMap(), gates: Int = 0, bosses: Int = 0, menus: Int = 0) =
        History(days, full, reps, gates, bosses, menus)

    @Test fun titles_uniqueAndNamed() {
        assertEquals(Achievements.all.size, Achievements.all.map { it.id }.toSet().size)
        Achievements.all.forEach { assertTrue(it.name.isNotBlank() && it.desc.isNotBlank()) }
    }

    @Test fun streak_7Wakes_unlocksEarlyRiser_brokenStreakDoesNot() {
        assertTrue("early_riser" in Achievements.unlocked(h(days = List(7) { setOf("wake") })))
        val broken = List(3) { setOf("wake") } + listOf(emptySet()) + List(3) { setOf("wake") }
        assertFalse("early_riser" in Achievements.unlocked(h(days = broken)))
        assertTrue("early_riser" in Achievements.unlocked(h(days = List(7) { setOf("wake") } + listOf(emptySet()))))
    }

    @Test fun totals_andCounts() {
        val u = Achievements.unlocked(h(reps = mapOf("pushup" to 1000), gates = 10, bosses = 1, menus = 10, full = List(7) { true }))
        assertTrue(u.containsAll(listOf("hundred_fists", "gate_breaker", "boss_slayer", "gourmet", "iron_body")))
        assertFalse("ten_thousand" in u)
    }

    @Test fun empty_unlocksNothing() = assertTrue(Achievements.unlocked(h()).isEmpty())
}
