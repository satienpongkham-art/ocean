package com.lifesystem.engine.progression

import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.model.Metrics

object Progression {
    /** EXP needed to clear level [level]: 500 + 150 × (L − 1). */
    fun expNeeded(level: Int): Int = 500 + 150 * (level - 1)

    /** Stored EXP is capped at 150 % of the bar (the "LIMIT" state). */
    fun expCap(level: Int): Int = expNeeded(level) * 3 / 2

    fun conditionFromSleep(hours: Double?): Condition = when {
        hours == null -> Condition.NORMAL
        hours >= 7.5 -> Condition.OPTIMAL
        hours >= 6.5 -> Condition.NORMAL
        else -> Condition.FATIGUED
    }

    /** Training volume multiplier: FATIGUED lowers load by 30 %. */
    fun conditionMultiplier(c: Condition): Double = if (c == Condition.FATIGUED) 0.7 else 1.0

    /** Extra EXP fraction: OPTIMAL sleep gives +10 %. */
    fun expBonus(c: Condition): Double = if (c == Condition.OPTIMAL) 0.10 else 0.0
}

sealed interface GateResult {
    data class Pass(val improved: List<String>) : GateResult
    data class NotEnoughExp(val missing: Int) : GateResult
    data object NoImprovement : GateResult
    data class RedFlag(val reason: String) : GateResult
}

/** Weekly assessment: level up only on real, above-noise improvement. */
object LevelGate {
    private const val WAIST_DROP_CM = 1.0
    private const val WEIGHT_DROP_KG = 0.3
    private const val PUSHUP_GAIN = 1
    private const val PLANK_GAIN_SEC = 5
    private const val ROPE_GAIN_SEC = 10
    private const val MAX_WEEKLY_LOSS = 0.015
    private const val MIN_SLEEP_H = 6.0

    fun evaluate(level: Int, exp: Int, best: Metrics, now: Metrics): GateResult {
        val need = Progression.expNeeded(level)
        if (exp < need) return GateResult.NotEnoughExp(need - exp)

        val prev = now.weightAvg7PrevWeek
        val cur = now.weightAvg7
        if (prev != null && cur != null && (prev - cur) / prev > MAX_WEEKLY_LOSS) {
            return GateResult.RedFlag("น้ำหนักลดเร็วเกิน 1.5% ต่อสัปดาห์")
        }
        val sleep = now.sleepAvg7h
        if (sleep != null && sleep < MIN_SLEEP_H) return GateResult.RedFlag("นอนเฉลี่ยต่ำกว่า 6 ชั่วโมง")

        val improved = buildList {
            if (dropped(best.waistCm, now.waistCm, WAIST_DROP_CM)) add("waist")
            if (dropped(best.weightAvg7, now.weightAvg7, WEIGHT_DROP_KG)) add("weight")
            if (gained(best.pushupMax, now.pushupMax, PUSHUP_GAIN)) add("pushup")
            if (gained(best.plankSec, now.plankSec, PLANK_GAIN_SEC)) add("plank")
            if (gained(best.ropeSec, now.ropeSec, ROPE_GAIN_SEC)) add("rope")
        }
        return if (improved.isEmpty()) GateResult.NoImprovement else GateResult.Pass(improved)
    }

    private fun dropped(best: Double?, now: Double?, by: Double) =
        best != null && now != null && best - now >= by - 1e-9

    private fun gained(best: Int?, now: Int?, by: Int) =
        best != null && now != null && now - best >= by
}
