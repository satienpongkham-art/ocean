package com.lifesystem.app.ui.quest

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.lifesystem.app.data.ProfileEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.SystemDb
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class QuestViewModelTest {
    @Test fun tick_onlyAllowedForSelfVerify() = runTest {
        val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java).allowMainThreadQueries().build()
        val repo = Repository(db)
        repo.saveProfile(ProfileEntity(name = "p", age = 25, sex = "MALE", heightCm = 180.0, day0EpochDay = 100))
        repo.ensureBoard(100)
        val actions = QuestActions(repo, 100)
        assertEquals(false, actions.tick("pushup"))
        assertEquals(0, db.dao().quest(100, "pushup")!!.progress)
        assertEquals(true, actions.tick("no_soda"))
        assertTrue(db.dao().quest(100, "no_soda")!!.done)
        assertEquals(false, actions.tick("water"))
        db.close()
    }

    private fun setup(): Pair<SystemDb, Repository> {
        val db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java).allowMainThreadQueries().build()
        return db to Repository(db)
    }

    @Test fun tick_maintenance_resetsDurability() = runTest {
        val (db, repo) = setup()
        repo.saveProfile(ProfileEntity(name = "p", age = 25, sex = "MALE", heightCm = 180.0, day0EpochDay = 100))
        repo.ensureBoard(100) // nothing seeded → maintenance due
        assertTrue(QuestActions(repo, 100).tick("mt_shave"))
        assertEquals(100L, db.dao().maintenance().first { it.routineId == "shave" }.lastDoneEpochDay)
        assertTrue(db.dao().quest(100, "mt_shave")!!.done)
        db.close()
    }

    @Test fun tick_buySunscreen_updatesInventory() = runTest {
        val (db, repo) = setup()
        repo.saveProfile(ProfileEntity(name = "p", age = 25, sex = "MALE", heightCm = 180.0, day0EpochDay = 100, hasSunscreen = false))
        repo.ensureBoard(100)
        assertTrue(QuestActions(repo, 100).tick("buy_sunscreen"))
        assertTrue(repo.profile()!!.hasSunscreen)
        assertTrue(repo.ensureBoard(101).any { it.questId == "skincare" })
        db.close()
    }

    @Test fun tick_wakeAndSleep_onlyInsideTimeWindow() = runTest {
        val (db, repo) = setup()
        repo.saveProfile(ProfileEntity(name = "p", age = 25, sex = "MALE", heightCm = 180.0, day0EpochDay = 100, wakeMin = 420, sleepMin = 1380))
        repo.ensureBoard(100)
        assertEquals(false, QuestActions(repo, 100) { 600 }.tick("wake"))
        assertEquals(true, QuestActions(repo, 100) { 440 }.tick("wake"))
        assertEquals(false, QuestActions(repo, 100) { 1200 }.tick("sleep"))
        assertEquals(true, QuestActions(repo, 100) { 1370 }.tick("sleep"))
        assertTrue(db.dao().quest(100, "sleep")!!.done)
        db.close()
    }
}
