package com.lifesystem.engine.stats

import com.lifesystem.engine.model.Rank

/**
 * Stat → rank tables (spec §4.3).
 *
 * STR uses the CSEP/CPAFLA push-up norms for men aged 20–29 for every profile in v1;
 * per-age/sex tables are a later refinement. VIT sub-bands, AGI bands and S tiers are
 * System-defined on top of the published cut-offs.
 */
object StatRanks {
    fun str(pushupMax: Int?): Rank = when {
        pushupMax == null -> Rank.UNKNOWN
        pushupMax >= 50 -> Rank.S
        pushupMax >= 36 -> Rank.A
        pushupMax >= 29 -> Rank.B
        pushupMax >= 22 -> Rank.C
        pushupMax >= 17 -> Rank.D
        else -> Rank.E
    }

    fun whtr(waistCm: Double, heightCm: Double): Double = waistCm / heightCm

    fun vit(waistCm: Double?, heightCm: Double, strRank: Rank): Rank {
        if (waistCm == null || heightCm <= 0.0) return Rank.UNKNOWN
        val r = whtr(waistCm, heightCm)
        return when {
            r >= 0.60 -> Rank.E
            r >= 0.55 -> Rank.D
            r >= 0.50 -> Rank.C
            r >= 0.45 -> Rank.B
            strRank != Rank.UNKNOWN && strRank >= Rank.B -> Rank.A
            else -> Rank.B
        }
    }

    fun agi(ropeSec: Int?): Rank = when {
        ropeSec == null -> Rank.UNKNOWN
        ropeSec >= 900 -> Rank.S
        ropeSec >= 600 -> Rank.A
        ropeSec >= 300 -> Rank.B
        ropeSec >= 120 -> Rank.C
        ropeSec >= 60 -> Rank.D
        else -> Rank.E
    }

    fun int(cefr: String?): Rank = when (cefr?.trim()?.uppercase()) {
        "A1" -> Rank.E
        "A2" -> Rank.D
        "B1" -> Rank.C
        "B2" -> Rank.B
        "C1" -> Rank.A
        "C2" -> Rank.S
        else -> Rank.UNKNOWN
    }

    fun fromScore(score0to100: Int?): Rank = when {
        score0to100 == null -> Rank.UNKNOWN
        score0to100 >= 95 -> Rank.S
        score0to100 >= 80 -> Rank.A
        score0to100 >= 60 -> Rank.B
        score0to100 >= 40 -> Rank.C
        score0to100 >= 20 -> Rank.D
        else -> Rank.E
    }

    /** Median of known ranks (lower middle on even count); S only when every known rank ≥ A. */
    fun overall(ranks: List<Rank>): Rank {
        val known = ranks.filter { it != Rank.UNKNOWN }.sorted()
        if (known.isEmpty()) return Rank.UNKNOWN
        val median = known[(known.size - 1) / 2]
        return if (median == Rank.S && known.any { it < Rank.A }) Rank.A else median
    }
}
