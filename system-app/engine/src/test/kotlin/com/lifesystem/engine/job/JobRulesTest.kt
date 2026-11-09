package com.lifesystem.engine.job

import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class JobRulesTest {
    @Test fun unlockAtLevel10() { assertFalse(JobRules.eligible(9)); assertTrue(JobRules.eligible(10)) }

    @Test fun pick_highestKnownRank_ignoresUnknown() {
        assertEquals(Job.SAGE, JobRules.pick(mapOf(Stat.STR to Rank.C, Stat.INT to Rank.B, Stat.CHA to Rank.UNKNOWN)))
        assertEquals(Job.WARRIOR, JobRules.pick(mapOf(Stat.STR to Rank.B, Stat.INT to Rank.B)))
        assertNull(JobRules.pick(mapOf(Stat.STR to Rank.UNKNOWN)))
    }

    @Test fun everyStatHasAJob() = assertEquals(setOf(Stat.STR, Stat.VIT, Stat.AGI, Stat.CHA, Stat.MND, Stat.INT), Job.values().map { it.stat }.toSet())
}
