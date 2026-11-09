package com.lifesystem.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        ProfileEntity::class, QuestEntity::class, DayEntity::class, MeasurementEntity::class,
        MealLogEntity::class, MaintenanceEntity::class, JournalEntity::class, WalletEntity::class,
        OwnedItemEntity::class, VaultEntryEntity::class, RewardEntity::class, AchievementEntity::class, BossResultEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class SystemDb : RoomDatabase() {
    abstract fun dao(): SystemDao

    companion object {
        @Volatile private var instance: SystemDb? = null

        fun get(context: Context): SystemDb = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, SystemDb::class.java, "system.db").addMigrations(Migrations.M1_2).build().also { instance = it }
        }
    }
}
