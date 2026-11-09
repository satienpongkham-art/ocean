package com.lifesystem.engine.quest

import com.lifesystem.engine.model.Quest
import com.lifesystem.engine.model.QuestType

data class DayResult(
    val mainDone: Int,
    val mainTotal: Int,
    val failed: List<String>,
    val penaltyTomorrow: Boolean,
    val goldEarned: Int,
    val expEarned: Int,
    val coreMisses: Int = 0,
)

/**
 * Settles a finished day: rewards for completed quests, penalty if any required quest is short.
 * [graceDay] (the install day) still pays rewards but never sets a penalty.
 */
object DayCloser {
    fun close(quests: List<Quest>, progress: Map<String, Int>, graceDay: Boolean = false): DayResult {
        fun done(q: Quest) = (progress[q.id] ?: 0) >= q.target
        val required = quests.filter { it.required }
        val failed = required.filterNot(::done).map { it.id }
        val coreMisses = quests.filter { it.core }.count { !done(it) }
        val completed = quests.filter(::done)
        val mains = quests.filter { it.type == QuestType.DAILY_MAIN }
        val fullClear = failed.isEmpty() && required.isNotEmpty()
        return DayResult(
            mainDone = mains.count(::done),
            mainTotal = mains.size,
            failed = failed,
            penaltyTomorrow = coreMisses > 0 && !graceDay,
            goldEarned = completed.sumOf { it.gold } + if (fullClear) BoardGenerator.FULL_CLEAR_GOLD else 0,
            expEarned = completed.sumOf { it.exp },
            coreMisses = coreMisses,
        )
    }

    /** Round 2 rule R2.3: money moved to savings after a failed core day. */
    fun penaltyFundBaht(coreMisses: Int): Int = when {
        coreMisses <= 0 -> 0
        coreMisses <= 2 -> 50
        else -> 100
    }
}
