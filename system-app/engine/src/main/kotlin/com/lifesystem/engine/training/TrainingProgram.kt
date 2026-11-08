package com.lifesystem.engine.training

import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.progression.Progression
import kotlin.math.roundToInt

/** Daily volumes (spec §6). Day numbers start at 1 = Day 0 assessment day + first quests. */
object TrainingProgram {
    private const val PUSHUP_START = 10
    private const val PUSHUP_GOAL = 100
    private const val GOAL_DAY = 30

    /** 10 → 100 push-ups/day by day 30, with a 70 % deload every 5th day before day 30. */
    fun pushupTotal(day: Int): Int {
        val d = day.coerceAtLeast(1)
        if (d >= GOAL_DAY) return PUSHUP_GOAL
        val base = (PUSHUP_START + (PUSHUP_GOAL - PUSHUP_START) * (d - 1) / (GOAL_DAY - 1).toDouble()).roundToInt()
        return if (d % 5 == 0) (base * 0.7).roundToInt() else base
    }

    fun squatTotal(day: Int): Int = minOf(2 * pushupTotal(day), 150)

    fun ropeSeconds(day: Int): Int = minOf(90 + 10 * (day.coerceAtLeast(1) - 1), 600)

    fun scaled(total: Int, c: Condition): Int = (total * Progression.conditionMultiplier(c)).roundToInt()

    /** Fewest sets of at most [maxPerSet], as even as possible, larger sets first. */
    fun sets(total: Int, maxPerSet: Int): List<Int> {
        if (total <= 0 || maxPerSet <= 0) return emptyList()
        val n = (total + maxPerSet - 1) / maxPerSet
        val base = total / n
        val extra = total % n
        return List(n) { i -> base + if (i < extra) 1 else 0 }
    }

    /** Zone-2 minutes per week: 60 in week 1, +20 per week, capped at 150 (WHO 150–300). */
    fun zone2WeeklyMinutes(week: Int): Int = minOf(60 + 20 * (week.coerceAtLeast(1) - 1), 150)

    fun readingPages(day: Int): Int = minOf(5 + (day.coerceAtLeast(1) - 1) / 2, 20)

    fun englishMinutes(day: Int): Int = minOf(15 + (day.coerceAtLeast(1) - 1) / 2, 30)
}
