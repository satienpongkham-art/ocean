package com.lifesystem.engine.gate

import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Verify
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class GateGeneratorTest {
    private fun gates(day: Long, level: Int = 1) = GateGenerator.generate(day, level, wakeMin = 420, sleepMin = 1380)

    @Test fun deterministic_andAtMostTwo() {
        (20_000L..20_200L).forEach { d ->
            assertEquals(gates(d), gates(d))
            assertTrue(gates(d).size <= 2)
        }
        assertTrue((20_000L..20_200L).any { gates(it).size == 2 })
        assertTrue((20_000L..20_200L).any { gates(it).isEmpty() })
    }

    @Test fun windows_insideWakingHours_andApart() {
        (20_000L..20_300L).forEach { d ->
            val g = gates(d)
            g.forEach {
                assertTrue(it.openMin >= 420 + 120)
                assertTrue(it.closeMin <= 1380 - 120)
                assertEquals(GateGenerator.DURATION_MIN, it.closeMin - it.openMin)
                assertEquals(2, it.tasks.size)
                assertEquals(2, it.tasks.map { t -> t.exercise }.toSet().size)
            }
            if (g.size == 2) assertTrue(g[1].openMin - g[0].closeMin >= 30)
        }
    }

    @Test fun rank_byLevel_scalesVolume() {
        assertEquals(Rank.E, GateGenerator.rankFor(1)); assertEquals(Rank.D, GateGenerator.rankFor(5))
        assertEquals(Rank.C, GateGenerator.rankFor(10)); assertEquals(Rank.B, GateGenerator.rankFor(20)); assertEquals(Rank.A, GateGenerator.rankFor(30))
        assertEquals(20, GateGenerator.volume("pushup", Rank.E)); assertEquals(30, GateGenerator.volume("pushup", Rank.D))
        assertEquals(60, GateGenerator.volume("rope", Rank.E))
    }

    @Test fun quests_areGateTypeWithWindow() {
        val g = (20_000L..20_100L).map { gates(it) }.first { it.isNotEmpty() }.first()
        val qs = GateGenerator.quests(g)
        assertEquals(2, qs.size)
        qs.forEach {
            assertEquals(QuestType.GATE, it.type); assertEquals(Verify.SENSOR, it.verify)
            assertEquals(g.openMin, it.openMin); assertEquals(g.closeMin, it.closeMin)
            assertTrue(it.id.startsWith("gate${g.index}_")); assertTrue(it.required)
        }
        assertEquals(g.gold, qs.sumOf { it.gold })
    }

    @Test fun drops_followRates() {
        val n = 4000
        val counts = (0 until n).map { GateGenerator.drop(20_000L + it, 0) }.groupingBy { it }.eachCount()
        fun share(d: Drop) = counts.getOrDefault(d, 0) / n.toDouble()
        assertEquals(0.5, share(Drop.EXP_SCROLL), 0.05)
        assertEquals(0.2, share(Drop.REST_TICKET), 0.05)
        assertEquals(0.1, share(Drop.PENALTY_SHIELD), 0.05)
        assertEquals(0.2, share(Drop.COSMETIC_SHARD), 0.05)
        assertEquals(GateGenerator.drop(20_000L, 1), GateGenerator.drop(20_000L, 1))
    }

    @Test fun lateSleeper_windowStillValid() {
        (20_000L..20_100L).forEach { d ->
            GateGenerator.generate(d, 1, wakeMin = 600, sleepMin = 90).forEach { assertTrue(it.openMin >= 720 && it.closeMin <= 1439) }
        }
    }
}
