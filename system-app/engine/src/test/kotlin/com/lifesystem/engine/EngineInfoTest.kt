package com.lifesystem.engine

import com.lifesystem.engine.model.EngineInfo
import org.junit.Assert.assertEquals
import org.junit.Test

class EngineInfoTest {
    @Test
    fun version_isSet() {
        assertEquals("0.1.0", EngineInfo.VERSION)
    }
}
