package com.lifesystem.engine.night

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/** Screen turned on (interactive = true) or off at [tMs]. */
data class ScreenEvent(val tMs: Long, val interactive: Boolean)

/** Null fields mean "no data" (nothing recorded), not failure. */
data class NightResult(
    val sleepStartMs: Long?,
    val sleepEndMs: Long?,
    val hours: Double?,
    val screenOffBeforeBed: Boolean?,
    val bedOnTime: Boolean?,
)

/** Round 1.5 rule R4: estimate last night's sleep and screen habits from screen on/off events. */
object NightAnalyzer {
    private const val MIN_SLEEP_MS = 3 * 60 * 60 * 1000L
    private const val SCREEN_OFF_MIN = 30L
    private const val BED_GRACE_MIN = 30L

    /** [nightEpochDay] is the evening the night starts on; [bedMin] is bedtime as minutes of day. */
    fun analyze(events: List<ScreenEvent>, nightEpochDay: Long, bedMin: Int, zone: ZoneId, windowEndMs: Long): NightResult {
        val sorted = events.sortedBy { it.tMs }
        val evening = LocalDate.ofEpochDay(nightEpochDay)
        fun ms(date: LocalDate, minute: Int) = date.atTime(LocalTime.of(minute / 60, minute % 60)).atZone(zone).toInstant().toEpochMilli()
        val earliestStart = ms(evening, 20 * 60)
        val latestStart = ms(evening.plusDays(1), 4 * 60)
        val bedMs = ms(if (bedMin < 12 * 60) evening.plusDays(1) else evening, bedMin)

        // Longest screen-off gap that starts in the night window.
        var best: Pair<Long, Long>? = null
        sorted.forEachIndexed { i, e ->
            if (e.interactive || e.tMs !in earliestStart..latestStart) return@forEachIndexed
            val end = sorted.drop(i + 1).firstOrNull { it.interactive }?.tMs ?: windowEndMs
            if (end - e.tMs >= MIN_SLEEP_MS && (best == null || end - e.tMs > best!!.second - best!!.first)) best = e.tMs to end
        }

        val windowStart = bedMs - SCREEN_OFF_MIN * 60_000
        val before = sorted.lastOrNull { it.tMs < windowStart }
        val inside = sorted.any { it.tMs in windowStart..bedMs }
        val screenOff = when {
            inside -> false
            before == null -> null
            else -> !before.interactive
        }

        val sleep = best
        return NightResult(
            sleepStartMs = sleep?.first,
            sleepEndMs = sleep?.second,
            hours = sleep?.let { (it.second - it.first) / 3_600_000.0 },
            screenOffBeforeBed = screenOff,
            bedOnTime = sleep?.let { it.first <= bedMs + BED_GRACE_MIN * 60_000 },
        )
    }

    /** Wall-clock helper for callers. */
    fun instant(ms: Long): Instant = Instant.ofEpochMilli(ms)
}
