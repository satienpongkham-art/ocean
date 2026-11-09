package com.lifesystem.app.health

import com.lifesystem.app.data.Keys
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.getInt
import com.lifesystem.app.data.putBool
import com.lifesystem.engine.screen.ScreenTimeBoss
import com.lifesystem.app.data.OwnedItemEntity
import com.lifesystem.app.data.ProfileEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.startOfDayMs
import com.lifesystem.engine.night.NightAnalyzer
import com.lifesystem.engine.night.ScreenEvent
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.ZoneId

/** Screen on/off history; null when the user has not granted usage access. */
interface ScreenSource {
    suspend fun events(fromMs: Long, toMs: Long): List<ScreenEvent>?
    /** Minutes spent in social/game/video apps (Screen-time Boss); null without usage access. */
    suspend fun entertainmentMinutes(fromMs: Long, toMs: Long): Int? = null
}

/** Health Connect (or another health store); null = no data or no permission. */
interface HealthSource {
    /** The main sleep session (start, end) inside the range. */
    suspend fun sleep(fromMs: Long, toMs: Long): Pair<Long, Long>?
    suspend fun steps(fromMs: Long, toMs: Long): Int?
}

/** Fallback step source (phone step counter). */
fun interface StepSource {
    suspend fun stepsToday(epochDay: Long): Int?
}

/**
 * The one entry point that prepares a day (round 1.5 rule R4):
 * judge last night from real data → close yesterday and build today's board → today's steps.
 */
class DaySync(
    private val repo: Repository,
    private val screen: ScreenSource,
    private val health: HealthSource,
    private val stepFallback: StepSource? = null,
    private val zone: ZoneId = ZoneId.systemDefault(),
) {
    private val mutex = Mutex()

    suspend fun sync(today: Long) = mutex.withLock {
        val p = repo.profile() ?: return@withLock
        val minute = repo.minuteOfDay()
        if (minute >= 4 * 60) judgeNight(today - 1, today, p, minute)
        repo.ensureBoard(today)
        val now = repo.nowMs()
        val steps = health.steps(startOfDayMs(today), now) ?: stepFallback?.stepsToday(today)
        if (steps != null) repo.setProgress(today, "steps", steps)
    }

    private suspend fun judgeNight(night: Long, today: Long, p: ProfileEntity, minute: Int) {
        val mark = "night_$night"
        if (repo.dao.ownedItem(mark) != null) return
        val now = repo.nowMs()
        val events = screen.events(startOfDayMs(night) + 12 * HOUR, now)
        val est = events?.let { NightAnalyzer.analyze(it, night, p.sleepMin, zone, now) }
        if (est?.screenOffBeforeBed == true) repo.complete(night, "screen_off")
        if (events != null) {
            // Night Owl (R2.6): screen turned on between 00:00 and 04:00 of today
            val midnight = startOfDayMs(today)
            if (events.any { it.interactive && it.tMs in midnight until midnight + 4 * HOUR }) repo.putBool(Keys.nightOwl(today), true)
            // Trust input (R2.7): screen still on 30+ min after bedtime
            val bedMs = startOfDayMs(if (p.sleepMin < 12 * 60) night + 1 else night) + p.sleepMin * 60_000L
            if (events.any { it.interactive && it.tMs in bedMs + BED_GRACE_MS until bedMs + 4 * HOUR }) repo.putBool(Keys.screenAfterBed(night), true)
        }
        // Screen-time Boss (R2.5): judge yesterday's entertainment minutes against the cap
        screen.entertainmentMinutes(startOfDayMs(night), startOfDayMs(today))?.let { used ->
            if (ScreenTimeBoss.evaluate(used, repo.getInt(Keys.SCREEN_CAP, ScreenTimeBoss.DEFAULT_CAP_MIN)).win) repo.complete(night, "screen_cap")
        }

        val session = health.sleep(startOfDayMs(night) + 18 * HOUR, startOfDayMs(today) + 14 * HOUR)
            ?: est?.let { e -> e.sleepStartMs?.let { s -> e.sleepEndMs?.let { s to it } } }
        if (session == null) {
            if (minute >= 12 * 60) repo.dao.upsertOwned(OwnedItemEntity(mark, "MARK", 1)) // give up for this night
            return
        }
        val (start, end) = session
        repo.logMeasurement(MeasureType.SLEEP_H, (end - start) / HOUR.toDouble())
        val bedMs = startOfDayMs(if (p.sleepMin < 12 * 60) night + 1 else night) + p.sleepMin * 60_000L
        if (start <= bedMs + BED_GRACE_MS) repo.complete(night, "sleep")
        repo.dao.upsertOwned(OwnedItemEntity(mark, "MARK", 1))
    }

    private companion object {
        const val HOUR = 60 * 60 * 1000L
        const val BED_GRACE_MS = 30 * 60 * 1000L
    }
}
