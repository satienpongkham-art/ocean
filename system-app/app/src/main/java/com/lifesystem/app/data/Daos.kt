package com.lifesystem.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface SystemDao {
    @Upsert suspend fun upsertProfile(p: ProfileEntity)
    @Query("SELECT * FROM profile WHERE id = 1") suspend fun profile(): ProfileEntity?
    @Query("SELECT * FROM profile WHERE id = 1") fun profileFlow(): Flow<ProfileEntity?>

    @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun insertQuests(q: List<QuestEntity>)
    @Upsert suspend fun upsertQuest(q: QuestEntity)
    @Query("SELECT * FROM quest WHERE epochDay = :day") suspend fun questsFor(day: Long): List<QuestEntity>
    @Query("SELECT * FROM quest WHERE epochDay = :day") fun questsFlow(day: Long): Flow<List<QuestEntity>>
    @Query("SELECT * FROM quest WHERE epochDay = :day AND questId = :id") suspend fun quest(day: Long, id: String): QuestEntity?

    @Upsert suspend fun upsertDay(d: DayEntity)
    @Query("SELECT * FROM day WHERE epochDay = :day") suspend fun day(day: Long): DayEntity?
    @Query("SELECT * FROM day WHERE closed = 0 AND epochDay < :day ORDER BY epochDay") suspend fun unclosedBefore(day: Long): List<DayEntity>
    @Query("SELECT * FROM day WHERE epochDay < :day ORDER BY epochDay DESC LIMIT 1") suspend fun lastDayBefore(day: Long): DayEntity?
    @Query("SELECT * FROM day ORDER BY epochDay DESC LIMIT :n") fun recentDays(n: Int): Flow<List<DayEntity>>

    @Insert suspend fun insertMeasurement(m: MeasurementEntity)
    @Query("SELECT * FROM measurement WHERE type = :type ORDER BY tMs DESC LIMIT 1") suspend fun latest(type: String): MeasurementEntity?
    @Query("SELECT * FROM measurement WHERE type = :type AND tMs >= :fromMs ORDER BY tMs") suspend fun since(type: String, fromMs: Long): List<MeasurementEntity>
    @Query("SELECT * FROM measurement WHERE type = :type ORDER BY tMs DESC LIMIT :n") fun recent(type: String, n: Int): Flow<List<MeasurementEntity>>

    @Insert suspend fun insertMeal(m: MealLogEntity)
    @Query("SELECT * FROM meal_log WHERE epochDay = :day") fun mealsFlow(day: Long): Flow<List<MealLogEntity>>

    @Upsert suspend fun upsertMaintenance(m: MaintenanceEntity)
    @Query("SELECT * FROM maintenance") suspend fun maintenance(): List<MaintenanceEntity>
    @Query("SELECT * FROM maintenance") fun maintenanceFlow(): Flow<List<MaintenanceEntity>>

    @Upsert suspend fun upsertJournal(j: JournalEntity)
    @Query("SELECT * FROM journal WHERE epochDay = :day") suspend fun journal(day: Long): JournalEntity?

    @Upsert suspend fun upsertWallet(w: WalletEntity)
    @Query("SELECT * FROM wallet WHERE id = 1") suspend fun wallet(): WalletEntity?
    @Query("SELECT * FROM wallet WHERE id = 1") fun walletFlow(): Flow<WalletEntity?>
}
