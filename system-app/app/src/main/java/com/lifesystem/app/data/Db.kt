package com.lifesystem.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        ProfileEntity::class, QuestEntity::class, DayEntity::class, MeasurementEntity::class,
        MealLogEntity::class, MaintenanceEntity::class, JournalEntity::class, WalletEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class SystemDb : RoomDatabase() {
    abstract fun dao(): SystemDao

    companion object {
        @Volatile private var instance: SystemDb? = null

        fun get(context: Context): SystemDb = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, SystemDb::class.java, "system.db").build().also { instance = it }
        }
    }
}
