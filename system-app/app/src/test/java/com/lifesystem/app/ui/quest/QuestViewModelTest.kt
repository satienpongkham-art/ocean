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
}
