package com.lifesystem.engine.avatar

import com.lifesystem.engine.model.Rank
import org.junit.Assert.assertEquals
import org.junit.Test

class AvatarStageTest {
    @Test fun stages() {
        assertEquals(1, AvatarStage.stage(null, Rank.UNKNOWN))
        assertEquals(1, AvatarStage.stage(2.9, Rank.E))
        assertEquals(2, AvatarStage.stage(3.0, Rank.E))
        assertEquals(2, AvatarStage.stage(0.0, Rank.D))
        assertEquals(3, AvatarStage.stage(6.0, Rank.E))
        assertEquals(3, AvatarStage.stage(9.0, Rank.C))
        assertEquals(4, AvatarStage.stage(10.0, Rank.B))
        assertEquals(3, AvatarStage.stage(10.0, Rank.C))
        assertEquals(5, AvatarStage.stage(14.0, Rank.A))
        assertEquals(5, AvatarStage.stage(20.0, Rank.S))
    }
}
