package com.lifesystem.app.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.quest.BoardGenerator
import com.lifesystem.engine.training.TrainingProgram
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

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RepositoryTest {
    private lateinit var db: SystemDb
    private lateinit var repo: Repository
    private val day0 = 20_000L

    @Before fun setUp() = runTest {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java)
            .allowMainThreadQueries().build()
        repo = Repository(db)
        repo.saveProfile(ProfileEntity(name = "ผู้เล่น", age = 25, sex = "MALE", heightCm = 180.0, day0EpochDay = day0))
    }

    @After fun tearDown() = db.close()

    @Test fun ensureBoard_createsOnce() = runTest {
        val first = repo.ensureBoard(day0)
        val second = repo.ensureBoard(day0)
        assertTrue(first.isNotEmpty())
        assertEquals(first.map { it.questId }, second.map { it.questId })
        assertEquals(db.dao().questsFor(day0).size, first.size)
    }

    @Test fun ensureBoard_isIdempotent_andClosesPreviousDay() = runTest {
        val d1 = day0 + 1
        repo.ensureBoard(d1)
        repo.addProgress(d1, "pushup", 4)
        val next = repo.ensureBoard(d1 + 1)
        val closed = db.dao().day(d1)!!
        assertTrue(closed.closed)
        assertTrue(closed.penaltyTomorrow)
        assertTrue(next.any { it.questId == "penalty" })
        repo.ensureBoard(d1 + 1)
        assertEquals(next.size, db.dao().questsFor(d1 + 1).size)
    }

    @Test fun installDay_neverCausesPenalty() = runTest {
        repo.ensureBoard(day0)
        val next = repo.ensureBoard(day0 + 1)
        assertTrue(db.dao().day(day0)!!.closed)
        assertFalse(db.dao().day(day0)!!.penaltyTomorrow)
        assertFalse(next.any { it.questId == "penalty" })
    }

    @Test fun seedMaintenance_preventsDay1Flood_andKeepsExisting() = runTest {
        repo.markMaintenanceDone("shave", day0 - 5)
        repo.seedMaintenance(day0)
        val rows = db.dao().maintenance().associate { it.routineId to it.lastDoneEpochDay }
        assertEquals(day0 - 5, rows["shave"])
        assertEquals(day0, rows["dental"])
        val mt = repo.ensureBoard(day0).filter { it.questId.startsWith("mt_") }.map { it.questId }
        assertEquals(listOf("mt_shave"), mt)
    }

    @Test fun reduceRemaining_oncePerDay_andNeverCompletesTheQuest() = runTest {
        repo.ensureBoard(day0)
        val full = db.dao().quest(day0, "pushup")!!.target
        repeat(5) { repo.reduceRemaining(day0, "pushup") }
        val q = db.dao().quest(day0, "pushup")!!
        assertEquals(full / 2, q.target)
        assertTrue(q.excused)
        assertFalse(q.done)
        repo.addProgress(day0, "pushup", 4)
        repo.reduceRemaining(day0, "pushup")
        assertEquals(full / 2, db.dao().quest(day0, "pushup")!!.target)
    }

    @Test fun reduceRemaining_keepsAtLeastOneRepLeft() = runTest {
        repo.ensureBoard(day0)
        val full = db.dao().quest(day0, "pushup")!!.target
        repo.addProgress(day0, "pushup", full - 1)
        repo.reduceRemaining(day0, "pushup")
        val q = db.dao().quest(day0, "pushup")!!
        assertEquals(full, q.target)
        assertFalse(q.done)
    }

    @Test fun optimalCondition_addsTenPercentExp() = runTest {
        val d1 = day0 + 1
        repo.logMeasurement(com.lifesystem.app.data.MeasureType.SLEEP_H, 8.0)
        val board = repo.ensureBoard(d1)
        assertEquals("OPTIMAL", db.dao().day(d1)!!.condition)
        val one = board.first { it.questId == "no_soda" }
        repo.complete(d1, one.questId)
        val before = repo.wallet().exp
        repo.ensureBoard(d1 + 1)
        assertEquals(before + (one.exp * 1.1).toInt(), repo.wallet().exp)
    }

    @Test fun addProgress_capsAtTarget_andMarksDone() = runTest {
        repo.ensureBoard(day0)
        repo.addProgress(day0, "pushup", 999)
        val q = db.dao().questsFor(day0).first { it.questId == "pushup" }
        assertEquals(q.target, q.progress)
        assertTrue(q.done)
    }

    @Test fun closingAwardsExpAndGold() = runTest {
        val board = repo.ensureBoard(day0)
        board.forEach { repo.complete(day0, it.questId) } // complete ignores gate windows
        repo.ensureBoard(day0 + 1)
        val w = repo.wallet()
        val mains = board.filter { it.type == QuestType.DAILY_MAIN.name }
        assertEquals(board.sumOf { it.gold } + BoardGenerator.FULL_CLEAR_GOLD, w.gold)
        assertTrue(w.exp > 0)
        assertFalse(db.dao().day(day0)!!.penaltyTomorrow)
        assertTrue(mains.isNotEmpty())
    }

    @Test fun reduceRemaining_halvesWhatIsLeft() = runTest {
        repo.ensureBoard(day0)
        repo.addProgress(day0, "squat", 4)
        repo.reduceRemaining(day0, "squat")
        val q = db.dao().quest(day0, "squat")!!
        assertEquals(4 + (TrainingProgram.squatTotal(1) - 4) / 2, q.target)
        assertFalse(q.done)
    }

    @Test fun noProfile_noBoard() = runTest {
        val empty = Repository(Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java).allowMainThreadQueries().build())
        assertTrue(empty.ensureBoard(day0).isEmpty())
    }
}
