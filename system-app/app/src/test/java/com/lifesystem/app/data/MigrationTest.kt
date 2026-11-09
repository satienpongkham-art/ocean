package com.lifesystem.app.data

import android.database.sqlite.SQLiteDatabase
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** v0.1.0 (schema 1) data must survive the update to schema 2. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MigrationTest {
    private val v1 = listOf(
            "CREATE TABLE IF NOT EXISTS `profile` (`id` INTEGER NOT NULL, `name` TEXT NOT NULL, `age` INTEGER NOT NULL, `sex` TEXT NOT NULL, `heightCm` REAL NOT NULL, `day0EpochDay` INTEGER NOT NULL, `wakeMin` INTEGER NOT NULL, `sleepMin` INTEGER NOT NULL, `mealTimes` TEXT NOT NULL, `weeklyBudget` INTEGER NOT NULL, `goalWeightKg` REAL, `hasSunscreen` INTEGER NOT NULL, `hasTapeMeasure` INTEGER NOT NULL, `hasArmband` INTEGER NOT NULL, PRIMARY KEY(`id`))",
            "CREATE TABLE IF NOT EXISTS `quest` (`epochDay` INTEGER NOT NULL, `questId` TEXT NOT NULL, `title` TEXT NOT NULL, `stat` TEXT NOT NULL, `type` TEXT NOT NULL, `grp` TEXT NOT NULL, `verify` TEXT NOT NULL, `target` INTEGER NOT NULL, `unit` TEXT NOT NULL, `exp` INTEGER NOT NULL, `gold` INTEGER NOT NULL, `progress` INTEGER NOT NULL, `done` INTEGER NOT NULL, `excused` INTEGER NOT NULL, PRIMARY KEY(`epochDay`, `questId`))",
            "CREATE TABLE IF NOT EXISTS `day` (`epochDay` INTEGER NOT NULL, `condition` TEXT NOT NULL, `closed` INTEGER NOT NULL, `goldEarned` INTEGER NOT NULL, `expEarned` INTEGER NOT NULL, `penaltyTomorrow` INTEGER NOT NULL, `mainDone` INTEGER NOT NULL, `mainTotal` INTEGER NOT NULL, PRIMARY KEY(`epochDay`))",
            "CREATE TABLE IF NOT EXISTS `measurement` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `type` TEXT NOT NULL, `value` REAL NOT NULL, `tMs` INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS `meal_log` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `epochDay` INTEGER NOT NULL, `slot` TEXT NOT NULL, `menuId` TEXT, `kcal` INTEGER NOT NULL, `protein` INTEGER NOT NULL, `price` INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS `maintenance` (`routineId` TEXT NOT NULL, `lastDoneEpochDay` INTEGER NOT NULL, PRIMARY KEY(`routineId`))",
            "CREATE TABLE IF NOT EXISTS `journal` (`epochDay` INTEGER NOT NULL, `text` TEXT NOT NULL, `emotion` TEXT NOT NULL, PRIMARY KEY(`epochDay`))",
            "CREATE TABLE IF NOT EXISTS `wallet` (`id` INTEGER NOT NULL, `exp` INTEGER NOT NULL, `level` INTEGER NOT NULL, `gold` INTEGER NOT NULL, PRIMARY KEY(`id`))",
    )

    @Test fun v1ToV2_keepsData() = runTest {
        val ctx = ApplicationProvider.getApplicationContext<android.content.Context>()
        val file = ctx.getDatabasePath("migrate.db").apply { parentFile?.mkdirs(); delete() }
        SQLiteDatabase.openOrCreateDatabase(file, null).use { db ->
            v1.forEach(db::execSQL)
            db.execSQL("CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)")
            db.execSQL("INSERT OR REPLACE INTO room_master_table (id,identity_hash) VALUES(42, 'b5ada1166880203c0a2a9a7ea8c1c73a')")
            db.execSQL("INSERT INTO profile VALUES(1,'p',30,'MALE',170.0,100,420,1380,'450,720,1080,1200',2000,NULL,0,1,0)")
            db.execSQL("INSERT INTO quest VALUES(100,'pushup','วิดพื้น','STR','DAILY_MAIN','TRAINING','SENSOR',50,'ครั้ง',40,4,12,0,0)")
            db.execSQL("INSERT INTO day VALUES(100,'NORMAL',0,0,0,0,0,0)")
            db.execSQL("INSERT INTO wallet VALUES(1,120,1,30)")
            db.version = 1
        }
        val room = Room.databaseBuilder(ctx, SystemDb::class.java, "migrate.db").addMigrations(Migrations.M1_2, Migrations.M2_3).allowMainThreadQueries().build()
        val dao = room.dao()
        assertEquals(170.0, dao.profile()!!.heightCm, 0.0)
        assertNull(dao.profile()!!.titleId)
        val q = dao.quest(100, "pushup")!!
        assertEquals(12, q.progress); assertNull(q.openMin)
        assertEquals(1.0, dao.day(100)!!.expMultiplier, 0.0)
        assertEquals(30, dao.wallet()!!.gold)
        dao.upsertOwned(OwnedItemEntity("aura_cyan", ItemKind.COSMETIC, 1))
        assertEquals(1, dao.owned().size)
        room.close()
    }

    /** v0.2.0 (schema 2, built from the exported schema file) must survive the update to schema 3. */
    @Test fun v2ToV3_keepsData() = runTest {
        val ctx = ApplicationProvider.getApplicationContext<android.content.Context>()
        val json = org.json.JSONObject(java.io.File("schemas/com.lifesystem.app.data.SystemDb/2.json").readText()).getJSONObject("database")
        val file = ctx.getDatabasePath("migrate3.db").apply { parentFile?.mkdirs(); delete() }
        SQLiteDatabase.openOrCreateDatabase(file, null).use { db ->
            val entities = json.getJSONArray("entities")
            for (i in 0 until entities.length()) {
                db.execSQL(entities.getJSONObject(i).getString("createSql").replace("\${TABLE_NAME}", entities.getJSONObject(i).getString("tableName")))
            }
            db.execSQL("CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)")
            db.execSQL("INSERT OR REPLACE INTO room_master_table (id,identity_hash) VALUES(42, '${json.getString("identityHash")}')")
            db.execSQL("INSERT INTO day (epochDay, condition, closed, goldEarned, expEarned, penaltyTomorrow, mainDone, mainTotal, expMultiplier, rest, gatesCleared) VALUES(100,'NORMAL',1,10,50,0,5,6,1.0,0,1)")
            db.execSQL("INSERT INTO owned_item VALUES('aura_cyan','COSMETIC',1)")
            db.version = 2
        }
        val room = Room.databaseBuilder(ctx, SystemDb::class.java, "migrate3.db").addMigrations(Migrations.M1_2, Migrations.M2_3).allowMainThreadQueries().build()
        val dao = room.dao()
        assertEquals(1, dao.day(100)!!.gatesCleared); assertEquals(0, dao.day(100)!!.coreMisses)
        assertEquals(1, dao.owned().size)
        dao.putSetting(SettingEntity("k", "v")); assertEquals("v", dao.setting("k"))
        room.close()
    }
}
