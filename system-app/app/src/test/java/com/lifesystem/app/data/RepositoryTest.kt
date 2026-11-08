package com.lifesystem.app.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.quest.BoardGenerator
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
        repo.ensureBoard(day0)
        repo.addProgress(day0, "pushup", 4)
        val day2 = repo.ensureBoard(day0 + 1)
        val closed = db.dao().day(day0)!!
        assertTrue(closed.closed)
        assertTrue(closed.penaltyTomorrow)
        assertTrue(day2.any { it.questId == "penalty" })
        repo.ensureBoard(day0 + 1)
        assertEquals(day2.size, db.dao().questsFor(day0 + 1).size)
    }

    @Test fun addProgress_capsAtTarget_andMarksDone() = runTest {
        repo.ensureBoard(day0)
        repo.addProgress(day0, "pushup", 15)
        val q = db.dao().questsFor(day0).first { it.questId == "pushup" }
        assertEquals(q.target, q.progress)
        assertTrue(q.done)
    }

    @Test fun closingAwardsExpAndGold() = runTest {
        val board = repo.ensureBoard(day0)
        board.forEach { repo.addProgress(day0, it.questId, it.target) }
        repo.ensureBoard(day0 + 1)
        val w = repo.wallet()
        val mains = board.filter { it.type == QuestType.DAILY_MAIN.name }
        assertEquals(board.sumOf { it.gold } + BoardGenerator.FULL_CLEAR_GOLD, w.gold)
        assertTrue(w.exp > 0)
        assertFalse(db.dao().day(day0)!!.penaltyTomorrow)
        assertTrue(mains.isNotEmpty())
    }

    @Test fun noProfile_noBoard() = runTest {
        val empty = Repository(Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java).allowMainThreadQueries().build())
        assertTrue(empty.ensureBoard(day0).isEmpty())
    }
}
