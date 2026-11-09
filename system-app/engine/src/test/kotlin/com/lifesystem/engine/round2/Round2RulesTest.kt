package com.lifesystem.engine.round2

import com.lifesystem.engine.chapters.ChapterProgress
import com.lifesystem.engine.chapters.Chapters
import com.lifesystem.engine.effects.Effect
import com.lifesystem.engine.effects.Effects
import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.report.DaySummary
import com.lifesystem.engine.report.ReportCard
import com.lifesystem.engine.screen.ScreenTimeBoss
import com.lifesystem.engine.shadow.Shadow
import com.lifesystem.engine.skills.SkillInput
import com.lifesystem.engine.skills.SkillTree
import com.lifesystem.engine.trust.Trust
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class Round2RulesTest {
    @Test fun effects() {
        val e = Effects.active(Condition.OPTIMAL, sodaYesterday = true, screenAfterMidnight = true)
        assertEquals(setOf(Effect.RESTED, Effect.SUGAR_CRASH, Effect.NIGHT_OWL), e.toSet())
        assertEquals(1.10 * 0.90 * 0.95, Effects.multiplier(e), 1e-9)
        assertEquals(1.0, Effects.multiplier(Effects.active(Condition.NORMAL, false, false)), 1e-9)
        assertEquals(Condition.NORMAL, Effects.adjust(Condition.OPTIMAL, nightOwl = true))
        assertEquals(Condition.FATIGUED, Effects.adjust(Condition.NORMAL, nightOwl = true))
        assertEquals(Condition.FATIGUED, Effects.adjust(Condition.FATIGUED, nightOwl = true))
    }

    @Test fun trust() {
        assertEquals(70, Trust.START)
        assertEquals(72, Trust.update(70, contradictions = 0))
        assertEquals(50, Trust.update(70, contradictions = 2))
        assertEquals(100, Trust.update(99, 0)); assertEquals(0, Trust.update(5, 1))
        assertEquals(1.2, Trust.selfMultiplier(80), 1e-9); assertEquals(1.0, Trust.selfMultiplier(60), 1e-9); assertEquals(0.8, Trust.selfMultiplier(40), 1e-9)
        assertEquals(2, Trust.contradictions(kitchenClose = true, mealAfter21 = true, manualSleep = true, screenOnAfterBed = true))
        assertEquals(0, Trust.contradictions(kitchenClose = false, mealAfter21 = true, manualSleep = false, screenOnAfterBed = true))
    }

    @Test fun screenBoss() {
        assertTrue(ScreenTimeBoss.evaluate(90, 120).win)
        assertFalse(ScreenTimeBoss.evaluate(150, 120).win)
        assertEquals(0.75f, ScreenTimeBoss.evaluate(90, 120).pressure, 1e-6f)
        assertEquals(1f, ScreenTimeBoss.evaluate(500, 120).pressure, 1e-6f)
    }

    @Test fun skills() {
        val none = SkillTree.unlocked(SkillInput())
        assertTrue(none.isEmpty())
        val u = SkillTree.unlocked(SkillInput(pushupMax = 30, maxSteps = 10_000, wakeStreak = 14))
        assertEquals(setOf("iron_arms", "wanderer", "early_bird"), u)
        assertEquals(0.05, SkillTree.expBonus(u, Stat.STR), 1e-9)
        assertEquals(0.0, SkillTree.expBonus(u, Stat.INT), 1e-9)
        assertEquals(8, SkillTree.all.size)
    }

    @Test fun shadow() {
        val logs = listOf(600 to 20, 700 to 15, 1000 to 30)
        assertEquals(35, Shadow.progressBy(logs, 800))
        assertTrue(Shadow.beats(today = 70, lastWeek = 65)); assertFalse(Shadow.beats(60, 65)); assertFalse(Shadow.beats(10, 0))
    }

    @Test fun chapters() {
        assertTrue(Chapters.unlocked(ChapterProgress()).isEmpty())
        assertEquals(listOf(1, 2), Chapters.unlocked(ChapterProgress(coreStreakMax = 7, gatesCleared = 1)))
        assertEquals(7, Chapters.all.size)
        Chapters.all.forEach { assertTrue(it.text.length > 20) }
    }

    @Test fun report() {
        val days = listOf(
            DaySummary(1, 10, 10, emptyList()), DaySummary(2, 6, 10, listOf("sleep", "read")),
            DaySummary(3, 5, 10, listOf("sleep", "pushup")), DaySummary(4, 9, 10, listOf("sleep")),
        )
        val r = ReportCard.build(days, weight = 70.0 to 69.4, waist = 90.0 to 89.0)
        assertEquals(75, r.completionPct)
        assertEquals(1L, r.bestDay)
        assertEquals("sleep" to 3, r.topMissed.first())
        assertEquals(-0.6, r.weightChange!!, 1e-9)
        assertTrue(r.advice.any { it.contains("นอน") })
        assertNull(ReportCard.build(emptyList(), null to null, null to null).bestDay)
    }
}
