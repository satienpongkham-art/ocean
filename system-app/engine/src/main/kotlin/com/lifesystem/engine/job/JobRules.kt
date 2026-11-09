package com.lifesystem.engine.job

import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat

enum class Job(val stat: Stat, val title: String) {
    WARRIOR(Stat.STR, "นักรบ"),
    GUARDIAN(Stat.VIT, "ผู้พิทักษ์"),
    HUNTER(Stat.AGI, "นักล่า"),
    BEACON(Stat.CHA, "ผู้นำแสง"),
    MONK(Stat.MND, "นักพรต"),
    SAGE(Stat.INT, "นักปราชญ์"),
}

/** Round 1.5 rule R9: class change at level 10, from the highest known stat rank. */
object JobRules {
    const val UNLOCK_LEVEL = 10
    const val EXP_BONUS = 0.10

    fun eligible(level: Int): Boolean = level >= UNLOCK_LEVEL

    fun pick(ranks: Map<Stat, Rank>): Job? = Job.values()
        .mapNotNull { j -> ranks[j.stat]?.takeIf { it != Rank.UNKNOWN }?.let { j to it } }
        .maxWithOrNull(compareBy<Pair<Job, Rank>> { it.second.ordinal }.thenByDescending { it.first.ordinal })
        ?.first
}
