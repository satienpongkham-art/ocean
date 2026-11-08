package com.lifesystem.app.ui.training

import org.junit.Assert.assertEquals
import org.junit.Test

class ThighAngleTest {
    private val standing = floatArrayOf(0f, 9.81f, 0f)

    @Test fun angleFromGravity_standingIsZero() =
        assertEquals(0f, thighAngleDeg(standing, floatArrayOf(0f, 9.81f, 0f)), 0.5f)

    @Test fun angleFromGravity_thighParallelIs90() =
        assertEquals(90f, thighAngleDeg(standing, floatArrayOf(0f, 0f, 9.81f)), 0.5f)

    @Test fun angleFromGravity_landscapePocketUsesCalibration() =
        assertEquals(90f, thighAngleDeg(floatArrayOf(9.81f, 0f, 0f), floatArrayOf(0f, 0f, -9.81f)), 0.5f)

    @Test fun angleFromGravity_zeroVectorIsZero() =
        assertEquals(0f, thighAngleDeg(standing, floatArrayOf(0f, 0f, 0f)), 0.001f)
}
