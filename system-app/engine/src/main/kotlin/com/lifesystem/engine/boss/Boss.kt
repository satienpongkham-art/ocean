package com.lifesystem.engine.boss

import com.lifesystem.engine.model.Metrics
import com.lifesystem.engine.progression.GateResult
import com.lifesystem.engine.progression.LevelGate
import com.lifesystem.engine.progression.Progression
import java.time.DayOfWeek
import java.time.LocalDate

/** Round 1.5 rule R6: the weekly level gate shown as a boss fight. */
object Boss {
    const val HP = 100
    const val DAMAGE_PER_METRIC = 35

    data class Outcome(val damage: Int, val hpLeft: Int, val defeated: Boolean, val improved: List<String>, val result: GateResult)

    fun isBossDay(epochDay: Long): Boolean = LocalDate.ofEpochDay(epochDay).dayOfWeek == DayOfWeek.SUNDAY

    fun fight(level: Int, exp: Int, best: Metrics, now: Metrics): Outcome {
        val result = LevelGate.evaluate(level, exp, best, now)
        // Damage reflects real improvement even when EXP is still short.
        val improved = (LevelGate.evaluate(level, Progression.expNeeded(level), best, now) as? GateResult.Pass)?.improved.orEmpty()
        val damage = improved.size * DAMAGE_PER_METRIC
        val defeated = result is GateResult.Pass
        return Outcome(damage, if (defeated) 0 else (HP - damage).coerceIn(1, HP).let { if (damage == 0) HP else it }, defeated, improved, result)
    }

    fun levelUp(level: Int, exp: Int): Pair<Int, Int> = (level + 1) to (exp - Progression.expNeeded(level)).coerceAtLeast(0)
}
