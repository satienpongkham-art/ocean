package com.lifesystem.engine.training

import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.progression.Progression
import kotlin.math.roundToInt

/** Daily volumes (spec §6). Day numbers start at 1 = Day 0 assessment day + first quests. */
object TrainingProgram {
    /** Steps of indoor walking that make one "walk after a meal" session (≈ 10 minutes). */
    const val WALK_SESSION_STEPS = 800

    /** Linear ramp through day 1 → day 14 → day 60 anchors (round 1.5 rule R1). */
    private fun ramp(day: Int, d1: Int, d14: Int, d60: Int): Int {
        val d = day.coerceAtLeast(1)
        val v = when {
            d <= 14 -> d1 + (d14 - d1) * (d - 1) / 13.0
            d <= 60 -> d14 + (d60 - d14) * (d - 14) / 46.0
            else -> d60.toDouble()
        }
        return v.roundToInt()
    }

    /** Every 5th day is a 70 % recovery day. */
    private fun deload(day: Int, total: Int): Int = if (day.coerceAtLeast(1) % 5 == 0) (total * 0.7).roundToInt() else total

    /** Cumulative push-ups for the day: 50 → 100 (day 14) → 200 (day 60). */
    fun pushupTotal(day: Int): Int = deload(day, ramp(day, 50, 100, 200))

    fun squatTotal(day: Int): Int = deload(day, ramp(day, 100, 150, 200))

    fun situpTotal(day: Int): Int = deload(day, ramp(day, 50, 100, 200))

    fun ropeSeconds(day: Int): Int = ramp(day, 180, 300, 600)

    /** 6000 → 7000 (day 14) → 8000 (day 28 on). */
    fun stepsTarget(day: Int): Int {
        val d = day.coerceAtLeast(1)
        val v = when {
            d <= 14 -> 6000 + 1000 * (d - 1) / 13.0
            d <= 28 -> 7000 + 1000 * (d - 14) / 14.0
            else -> 8000.0
        }
        return (v / 100).roundToInt() * 100
    }

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
