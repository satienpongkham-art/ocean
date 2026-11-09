package com.lifesystem.engine.avatar

import com.lifesystem.engine.model.Rank

/** Round 1.5 rule R10: the avatar's body stage from real waist loss and strength. */
object AvatarStage {
    const val MAX = 5

    private fun atLeast(r: Rank, min: Rank) = r != Rank.UNKNOWN && r >= min

    fun stage(waistDropCm: Double?, strRank: Rank): Int {
        val d = waistDropCm ?: 0.0
        return when {
            d >= 14.0 && atLeast(strRank, Rank.A) -> 5
            d >= 10.0 && atLeast(strRank, Rank.B) -> 4
            d >= 6.0 || atLeast(strRank, Rank.C) -> 3
            d >= 3.0 || atLeast(strRank, Rank.D) -> 2
            else -> 1
        }
    }
}
