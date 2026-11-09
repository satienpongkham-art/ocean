package com.lifesystem.engine.night

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

class NightAnalyzerTest {
    private val zone = ZoneId.of("Asia/Bangkok")
    private val night = LocalDate.of(2026, 11, 8)
    private fun at(day: Int, h: Int, m: Int = 0) = LocalDateTime.of(2026, 11, day, h, m).atZone(zone).toInstant().toEpochMilli()
    private fun on(t: Long) = ScreenEvent(t, true)
    private fun off(t: Long) = ScreenEvent(t, false)
    private fun analyze(events: List<ScreenEvent>, bedMin: Int = 23 * 60) =
        NightAnalyzer.analyze(events, night.toEpochDay(), bedMin, zone, windowEndMs = at(9, 10))

    @Test fun longestNightGap_isSleep() {
        val r = analyze(listOf(on(at(8, 21)), off(at(8, 22, 10)), on(at(8, 22, 20)), off(at(8, 22, 50)), on(at(9, 6, 50)), off(at(9, 7))))
        assertEquals(at(8, 22, 50), r.sleepStartMs)
        assertEquals(at(9, 6, 50), r.sleepEndMs)
        assertEquals(8.0, r.hours!!, 0.01)
        assertTrue(r.bedOnTime!!)
    }

    @Test fun screenOnInsideLast30MinBeforeBed_failsScreenOff() {
        val r = analyze(listOf(on(at(8, 22, 40)), off(at(8, 23, 5)), on(at(9, 7))))
        assertFalse(r.screenOffBeforeBed!!)
    }

    @Test fun screenOffBefore2230_passes() {
        val r = analyze(listOf(on(at(8, 21)), off(at(8, 22, 20)), on(at(9, 7))))
        assertTrue(r.screenOffBeforeBed!!)
    }

    @Test fun lateSleeper_notOnTime() {
        val r = analyze(listOf(on(at(8, 23)), off(at(9, 1, 30)), on(at(9, 8))))
        assertFalse(r.bedOnTime!!)
        assertEquals(6.5, r.hours!!, 0.01)
    }

    @Test fun shortGapsOnly_noSleepFound() {
        val r = analyze(listOf(off(at(8, 22)), on(at(8, 23)), off(at(8, 23, 30)), on(at(9, 1))))
        assertNull(r.hours)
        assertNull(r.bedOnTime)
    }

    @Test fun noEvents_unknown() {
        val r = analyze(emptyList())
        assertNull(r.hours); assertNull(r.screenOffBeforeBed)
    }

    @Test fun bedAfterMidnight_usesNextCalendarDay() {
        val r = analyze(listOf(on(at(9, 0, 10)), off(at(9, 0, 15)), on(at(9, 8))), bedMin = 30)
        assertFalse(r.screenOffBeforeBed!!)
        assertTrue(r.bedOnTime!!)
    }
}
