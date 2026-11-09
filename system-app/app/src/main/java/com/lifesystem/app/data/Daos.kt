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
    /** Atomic so concurrent rep events never lose an increment. */
    @Query("UPDATE quest SET progress = MIN(target, MAX(0, progress + :n)), done = MIN(target, MAX(0, progress + :n)) >= target WHERE epochDay = :day AND questId = :id")
    suspend fun addProgress(day: Long, id: String, n: Int)

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
    @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun insertMaintenanceIfMissing(m: List<MaintenanceEntity>)
    @Query("SELECT * FROM maintenance") suspend fun maintenance(): List<MaintenanceEntity>
    @Query("SELECT * FROM maintenance") fun maintenanceFlow(): Flow<List<MaintenanceEntity>>

    @Upsert suspend fun upsertJournal(j: JournalEntity)
    @Query("SELECT * FROM journal WHERE epochDay = :day") suspend fun journal(day: Long): JournalEntity?

    @Upsert suspend fun upsertOwned(i: OwnedItemEntity)
    @Query("SELECT * FROM owned_item") suspend fun owned(): List<OwnedItemEntity>
    @Query("SELECT * FROM owned_item") fun ownedFlow(): Flow<List<OwnedItemEntity>>
    @Query("SELECT * FROM owned_item WHERE id = :id") suspend fun ownedItem(id: String): OwnedItemEntity?
    @Query("DELETE FROM owned_item WHERE id = :id") suspend fun deleteOwned(id: String)

    @Insert suspend fun insertVault(e: VaultEntryEntity)
    @Query("SELECT * FROM vault_entry ORDER BY tMs DESC") fun vaultFlow(): Flow<List<VaultEntryEntity>>
    @Query("SELECT COALESCE(SUM(amount), 0) FROM vault_entry") suspend fun vaultBalance(): Int

    @Insert suspend fun insertReward(r: RewardEntity): Long
    @Upsert suspend fun upsertReward(r: RewardEntity)
    @Query("SELECT * FROM reward WHERE id = :id") suspend fun reward(id: Long): RewardEntity?
    @Query("SELECT * FROM reward ORDER BY redeemedMs IS NOT NULL, price") fun rewardsFlow(): Flow<List<RewardEntity>>
    @Query("DELETE FROM reward WHERE id = :id AND redeemedMs IS NULL") suspend fun deleteReward(id: Long)

    @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun insertAchievement(a: AchievementEntity): Long
    @Query("SELECT * FROM achievement") suspend fun achievements(): List<AchievementEntity>
    @Query("SELECT * FROM achievement") fun achievementsFlow(): Flow<List<AchievementEntity>>

    @Upsert suspend fun upsertBoss(b: BossResultEntity)
    @Query("SELECT * FROM boss_result WHERE epochDay = :day") suspend fun boss(day: Long): BossResultEntity?
    @Query("SELECT COUNT(*) FROM boss_result WHERE defeated = 1") suspend fun bossesDefeated(): Int

    @Query("SELECT * FROM day WHERE closed = 1 ORDER BY epochDay") suspend fun closedDays(): List<DayEntity>
    @Query("SELECT * FROM quest WHERE epochDay IN (SELECT epochDay FROM day WHERE closed = 1)") suspend fun closedQuests(): List<QuestEntity>
    @Query("SELECT COUNT(DISTINCT menuId) FROM meal_log WHERE menuId IS NOT NULL") suspend fun distinctMenus(): Int
    @Query("SELECT * FROM measurement WHERE type = :type AND tMs >= :fromMs AND tMs < :toMs ORDER BY tMs") suspend fun measurementsBetween(type: String, fromMs: Long, toMs: Long): List<MeasurementEntity>
    @Query("UPDATE quest SET progress = MIN(target, MAX(0, :v)), done = MIN(target, MAX(0, :v)) >= target WHERE epochDay = :day AND questId = :id")
    suspend fun setProgress(day: Long, id: String, v: Int)
    @Query("DELETE FROM quest WHERE epochDay = :day AND questId = :id") suspend fun deleteQuest(day: Long, id: String)
    @Query("SELECT * FROM measurement WHERE type = :type ORDER BY tMs ASC LIMIT 1") suspend fun earliest(type: String): MeasurementEntity?
    @Query("SELECT * FROM measurement WHERE type = :type AND tMs >= :fromMs ORDER BY tMs") fun sinceFlow(type: String, fromMs: Long): Flow<List<MeasurementEntity>>

    @Upsert suspend fun upsertWallet(w: WalletEntity)
    @Query("SELECT * FROM wallet WHERE id = 1") suspend fun wallet(): WalletEntity?
    @Query("SELECT * FROM wallet WHERE id = 1") fun walletFlow(): Flow<WalletEntity?>
}
