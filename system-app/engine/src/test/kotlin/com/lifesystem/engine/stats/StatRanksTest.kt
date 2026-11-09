package com.lifesystem.engine.stats

import com.lifesystem.engine.model.Rank.A
import com.lifesystem.engine.model.Rank.B
import com.lifesystem.engine.model.Rank.C
import com.lifesystem.engine.model.Rank.D
import com.lifesystem.engine.model.Rank.E
import com.lifesystem.engine.model.Rank.S
import com.lifesystem.engine.model.Rank.UNKNOWN
import org.junit.Assert.assertEquals
import org.junit.Test

class StatRanksTest {
    @Test fun str_bands() {
        assertEquals(E, StatRanks.str(16)); assertEquals(D, StatRanks.str(17)); assertEquals(C, StatRanks.str(28))
        assertEquals(B, StatRanks.str(29)); assertEquals(A, StatRanks.str(36)); assertEquals(S, StatRanks.str(50))
        assertEquals(UNKNOWN, StatRanks.str(null))
    }

    @Test fun vit_bands() {
        assertEquals(E, StatRanks.vit(102.0, 170.0, C))
        assertEquals(D, StatRanks.vit(94.0, 170.0, C))
        assertEquals(C, StatRanks.vit(88.0, 170.0, C))
        assertEquals(B, StatRanks.vit(83.0, 170.0, C))
        assertEquals(A, StatRanks.vit(76.0, 170.0, B))
        assertEquals(B, StatRanks.vit(76.0, 170.0, C))
        assertEquals(UNKNOWN, StatRanks.vit(null, 170.0, C))
    }

    @Test fun agi_bands() {
        assertEquals(E, StatRanks.agi(59)); assertEquals(D, StatRanks.agi(60)); assertEquals(C, StatRanks.agi(120))
        assertEquals(B, StatRanks.agi(300)); assertEquals(A, StatRanks.agi(600)); assertEquals(S, StatRanks.agi(900))
    }

    @Test fun int_cefr() {
        assertEquals(E, StatRanks.int("A1")); assertEquals(C, StatRanks.int("b1")); assertEquals(S, StatRanks.int("C2"))
        assertEquals(UNKNOWN, StatRanks.int(null)); assertEquals(UNKNOWN, StatRanks.int("X9"))
    }

    @Test fun fromScore() {
        assertEquals(E, StatRanks.fromScore(19)); assertEquals(D, StatRanks.fromScore(20))
        assertEquals(A, StatRanks.fromScore(94)); assertEquals(S, StatRanks.fromScore(100))
        assertEquals(UNKNOWN, StatRanks.fromScore(null))
    }

    @Test fun overall_isMedian_andSNeedsAllA() {
        assertEquals(C, StatRanks.overall(listOf(E, D, C, C, B, A)))
        assertEquals(A, StatRanks.overall(listOf(S, S, S, S, S, B)))
        assertEquals(S, StatRanks.overall(listOf(S, S, S, S, S, S)))
        assertEquals(S, StatRanks.overall(listOf(S, S, S, S, A, A)))
    }

    @Test fun rank_unknownWhenNoMeasurement() {
        assertEquals(UNKNOWN, StatRanks.overall(List(6) { UNKNOWN }))
        assertEquals(D, StatRanks.overall(listOf(D, UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN)))
    }

    @Test fun whtr() = assertEquals(0.5, StatRanks.whtr(85.0, 170.0), 1e-9)
}
