package com.lifesystem.engine.maintenance

import org.junit.Assert.assertEquals
import org.junit.Test

class MaintenanceTest {
    @Test fun defaults_matchSpecIntervals() {
        val m = Maintenance.defaults.associate { it.id to it.intervalDays }
        assertEquals(10, m["nails_hand"]); assertEquals(28, m["nails_foot"]); assertEquals(28, m["haircut"])
        assertEquals(7, m["pillowcase"]); assertEquals(14, m["bedsheet"]); assertEquals(7, m["laundry_room"])
        assertEquals(105, m["toothbrush"]); assertEquals(180, m["dental"]); assertEquals(21, m["nose_brow"])
        assertEquals(2, m["shave"])
        Maintenance.defaults.forEach { assert(it.title.isNotBlank()) }
    }

    @Test fun durability() {
        assertEquals(0.0, Maintenance.durability(null, 100, 10), 1e-9)
        assertEquals(1.0, Maintenance.durability(100, 100, 10), 1e-9)
        assertEquals(0.5, Maintenance.durability(100, 105, 10), 1e-9)
        assertEquals(0.0, Maintenance.durability(100, 130, 10), 1e-9)
    }

    @Test fun due_returnsLowDurability() {
        val routines = listOf(MaintenanceRoutine("a", "A", 10), MaintenanceRoutine("b", "B", 10), MaintenanceRoutine("c", "C", 10))
        val due = Maintenance.due(routines, mapOf("a" to 100L, "b" to 92L), todayEpochDay = 101)
        assertEquals(listOf("b", "c"), due)
    }
}
