package com.lifesystem.app.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.lifesystem.engine.emergency.EmergencyGenerator
import com.lifesystem.engine.model.Quest
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
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class Round2RepositoryTest {
    private lateinit var db: SystemDb
    private lateinit var repo: Repository
    private val day0 = 20_000L
    private var now = 0L
    private fun ms(day: Long, minute: Int) = LocalDate.ofEpochDay(day).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() + minute * 60_000L
    private fun weekday(d: Long) = LocalDate.ofEpochDay(d).dayOfWeek
    /** A non-Sunday day after the grace day. */
    private fun workday(from: Long = day0 + 1) = (from..from + 7).first { weekday(it) != DayOfWeek.SUNDAY && weekday(it - 1) != DayOfWeek.SUNDAY }

    @Before fun setUp() = runTest {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java).allowMainThreadQueries().build()
        now = ms(day0, 600)
        repo = Repository(db) { now }
        repo.saveProfile(ProfileEntity(name = "p", age = 30, sex = "MALE", heightCm = 170.0, day0EpochDay = day0))
    }

    @After fun tearDown() = db.close()

    private suspend fun completeCore(d: Long) = db.dao().questsFor(d).filter { it.toQuest().core }.forEach { repo.complete(d, it.questId) }

    @Test fun nonCoreMiss_noPenalty_coreMiss_penaltyFund() = runTest {
        val d = workday()
        repo.ensureBoard(d); completeCore(d)
        val next = repo.ensureBoard(d + 1)
        assertFalse(db.dao().day(d)!!.penaltyTomorrow)
        assertTrue(next.none { it.questId == "penalty_fund" })
        // miss core on d+1 → fund on d+2
        val next2 = repo.ensureBoard(d + 2)
        val fund = next2.first { it.questId == "penalty_fund" }
        assertTrue(fund.unit.contains("100") || fund.unit.contains("50"))
        assertTrue(repo.payPenaltyFund(d + 2))
        assertTrue(db.dao().quest(d + 2, "penalty_fund")!!.done)
        assertTrue(db.dao().vaultBalance() >= 50)
    }

    @Test fun sugarCrash_reducesNextDayExp() = runTest {
        val d = workday()
        repo.ensureBoard(d) // no_soda not done
        val b2 = repo.ensureBoard(d + 1)
        val before = repo.wallet().exp
        val q = b2.first { it.questId == "english" }
        repo.complete(d + 1, q.questId)
        repo.ensureBoard(d + 2)
        assertEquals(before + (q.exp * 0.9).toInt(), repo.wallet().exp)
    }

    @Test fun trust_dropsOnContradiction() = runTest {
        val d = workday()
        repo.ensureBoard(d)
        repo.putSetting("manual_sleep_$d", "1"); repo.putSetting("screen_after_bed_$d", "1")
        repo.ensureBoard(d + 1)
        assertEquals(60, repo.getInt(Keys.TRUST, -1))
    }

    @Test fun shadow_beatingLastWeek_givesGold() = runTest {
        val d = workday(day0 + 8)
        repo.ensureBoard(d - 7); repo.addProgress(d - 7, "pushup", 20)
        repo.ensureBoard(d); repo.addProgress(d, "pushup", 30)
        repo.ensureBoard(d + 1)
        assertEquals(5, db.dao().day(d)!!.goldEarned)
    }

    @Test fun sevenCoreDays_unlockChapterOne_withReward() = runTest {
        var d = day0 + 1
        repeat(8) { repo.ensureBoard(d); completeCore(d); d++ }
        repo.ensureBoard(d)
        assertTrue("1" in repo.getSetting(Keys.CHAPTERS, "").split(","))
        assertTrue(repo.wallet().gold >= 100)
    }

    @Test fun expenses_decideBudgetQuest() = runTest {
        val d = workday()
        repo.ensureBoard(d); repo.addExpense(d, 120, "อาหาร")
        repo.ensureBoard(d + 1); repo.addExpense(d + 1, 999, "เกม")
        repo.ensureBoard(d + 2)
        assertTrue(db.dao().quest(d, "budget")!!.done)
        assertFalse(db.dao().quest(d + 1, "budget")!!.done)
    }

    @Test fun boardExtras_workEmergencyDumbbellFocus() = runTest {
        repo.putSetting(Keys.WORK, "ลงคลิป 1 ชิ้น|1\nโพสต์กลุ่ม|20")
        val b = repo.ensureBoard(day0).map { it.questId }
        assertTrue("work_0" in b && "work_1" in b && "focus" in b)
        val emgDay = (day0 + 1..day0 + 60).first { EmergencyGenerator.generate(it, 420, 1380) != null }
        assertTrue(repo.ensureBoard(emgDay).any { it.questId.startsWith("emg_") })
        val monday = (day0 + 1..day0 + 7).first { weekday(it) == DayOfWeek.MONDAY }
        assertTrue(repo.ensureBoard(monday).any { it.questId == "db_curl" })
    }

    @Test fun weeklyReport_summarisesClosedDays() = runTest {
        var d = day0
        repeat(4) { repo.ensureBoard(d); if (it % 2 == 0) completeCore(d); d++ }
        repo.ensureBoard(d)
        val r = repo.weeklyReport(d)
        assertTrue(r.completionPct in 1..99)
        assertTrue(r.topMissed.isNotEmpty())
    }

    @Test fun sickDay_twicePerMonth() = runTest {
        val d = workday()
        repo.ensureBoard(d); assertTrue(repo.useSickDay(d))
        repo.ensureBoard(d + 1); assertTrue(repo.useSickDay(d + 1))
        repo.ensureBoard(d + 2)
        val third = repo.useSickDay(d + 2)
        assertEquals(LocalDate.ofEpochDay(d).monthValue != LocalDate.ofEpochDay(d + 2).monthValue, third)
        assertFalse(db.dao().day(d)!!.penaltyTomorrow)
    }

    @Suppress("unused") private val keep = Quest.CORE_IDS
}
