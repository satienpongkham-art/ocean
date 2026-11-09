package com.lifesystem.app.health

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.ProfileEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.SystemDb
import com.lifesystem.app.data.getBool
import com.lifesystem.app.data.putSetting
import com.lifesystem.engine.night.ScreenEvent
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.LocalDate
import java.time.ZoneId

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DaySyncTest {
    private lateinit var db: SystemDb
    private lateinit var repo: Repository
    private val day0 = 20_000L
    private var now = 0L
    private fun ms(day: Long, minute: Int) = LocalDate.ofEpochDay(day).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() + minute * 60_000L

    private class FakeScreen(var events: List<ScreenEvent>?, var fun_: Int? = null) : ScreenSource {
        override suspend fun events(fromMs: Long, toMs: Long) = events?.filter { it.tMs in fromMs..toMs }
        override suspend fun entertainmentMinutes(fromMs: Long, toMs: Long) = fun_
    }
    private class FakeHealth(var sleep: Pair<Long, Long>? = null, var steps: Int? = null) : HealthSource {
        override suspend fun sleep(fromMs: Long, toMs: Long) = sleep
        override suspend fun steps(fromMs: Long, toMs: Long) = steps
    }

    @Before fun setUp() = runTest {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java).allowMainThreadQueries().build()
        repo = Repository(db) { now }
        repo.saveProfile(ProfileEntity(name = "p", age = 30, sex = "MALE", heightCm = 170.0, day0EpochDay = day0, wakeMin = 420, sleepMin = 1380))
    }

    @After fun tearDown() = db.close()

    @Test fun screenEstimate_completesSleepAndScreenOff_logsHours_beforeBoard() = runTest {
        val d = day0 + 1
        now = ms(d, 600); repo.ensureBoard(d)
        val screen = FakeScreen(listOf(ScreenEvent(ms(d, 21 * 60), true), ScreenEvent(ms(d, 22 * 60 + 20), false), ScreenEvent(ms(d + 1, 7 * 60), true)))
        now = ms(d + 1, 7 * 60 + 30)
        DaySync(repo, screen, FakeHealth()).sync(d + 1)
        assertTrue(db.dao().quest(d, "sleep")!!.done)
        assertTrue(db.dao().quest(d, "screen_off")!!.done)
        assertEquals(8.67, repo.latest(MeasureType.SLEEP_H)!!.value, 0.01)
        assertEquals("OPTIMAL", db.dao().day(d + 1)!!.condition)
        assertTrue(db.dao().day(d)!!.closed)
    }

    @Test fun healthConnectSleep_overridesEstimate() = runTest {
        val d = day0 + 1
        now = ms(d, 600); repo.ensureBoard(d)
        val health = FakeHealth(sleep = ms(d + 1, 60) to ms(d + 1, 7 * 60)) // 01:00–07:00 → late, 6 h
        now = ms(d + 1, 8 * 60)
        DaySync(repo, FakeScreen(null), health).sync(d + 1)
        assertFalse(db.dao().quest(d, "sleep")!!.done)
        assertEquals(6.0, repo.latest(MeasureType.SLEEP_H)!!.value, 0.01)
    }

    @Test fun beforeFourAm_doesNotJudgeTheNight() = runTest {
        val d = day0 + 1
        now = ms(d, 600); repo.ensureBoard(d)
        now = ms(d + 1, 120)
        DaySync(repo, FakeScreen(listOf(ScreenEvent(ms(d, 22 * 60), false))), FakeHealth()).sync(d + 1)
        assertEquals(null, repo.latest(MeasureType.SLEEP_H))
    }

    @Test fun runsOncePerNight() = runTest {
        val d = day0 + 1
        now = ms(d, 600); repo.ensureBoard(d)
        val health = FakeHealth(sleep = ms(d, 22 * 60 + 30) to ms(d + 1, 6 * 60 + 30))
        now = ms(d + 1, 8 * 60)
        val sync = DaySync(repo, FakeScreen(null), health)
        sync.sync(d + 1); sync.sync(d + 1)
        assertEquals(1, db.dao().measurementsBetween(MeasureType.SLEEP_H, 0, Long.MAX_VALUE).size)
    }

    @Test fun steps_setTodaysProgress() = runTest {
        now = ms(day0, 15 * 60)
        DaySync(repo, FakeScreen(null), FakeHealth(steps = 4321)).sync(day0)
        assertEquals(4321, db.dao().quest(day0, "steps")!!.progress)
        DaySync(repo, FakeScreen(null), FakeHealth(steps = 9999)).sync(day0)
        assertTrue(db.dao().quest(day0, "steps")!!.done)
    }

    @Test fun nightOwl_screenAfterBed_andScreenBoss() = runTest {
        repo.putSetting(com.lifesystem.app.data.Keys.SCREEN_BOSS, "1")
        val d = day0 + 1
        now = ms(d, 600); repo.ensureBoard(d)
        val ev = listOf(ScreenEvent(ms(d, 22 * 60), false), ScreenEvent(ms(d, 23 * 60 + 50), true), ScreenEvent(ms(d + 1, 60), true), ScreenEvent(ms(d + 1, 90), false), ScreenEvent(ms(d + 1, 7 * 60), true))
        now = ms(d + 1, 8 * 60)
        DaySync(repo, FakeScreen(ev, fun_ = 80), FakeHealth()).sync(d + 1)
        assertTrue(repo.getBool(com.lifesystem.app.data.Keys.nightOwl(d + 1), false))
        assertTrue(repo.getBool(com.lifesystem.app.data.Keys.screenAfterBed(d), false))
        assertTrue(db.dao().quest(d, "screen_cap")!!.done)
        assertEquals("FATIGUED", db.dao().day(d + 1)!!.condition) // 5.5 h of sleep; Night Owl cannot raise it
    }
}
