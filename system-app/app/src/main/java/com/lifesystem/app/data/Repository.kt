package com.lifesystem.app.data

import androidx.room.withTransaction
import com.lifesystem.engine.maintenance.Maintenance
import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.model.Inventory
import com.lifesystem.engine.progression.Progression
import com.lifesystem.engine.quest.BoardGenerator
import com.lifesystem.engine.quest.DayCloser
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

/** Single entry point for app state. All game rules come from the engine. */
class Repository(private val db: SystemDb, private val nowMs: () -> Long = System::currentTimeMillis) {
    private val dao = db.dao()

    suspend fun saveProfile(p: ProfileEntity) = dao.upsertProfile(p)
    suspend fun profile(): ProfileEntity? = dao.profile()
    fun profileFlow(): Flow<ProfileEntity?> = dao.profileFlow()

    fun dayNumber(profile: ProfileEntity, epochDay: Long): Int = (epochDay - profile.day0EpochDay + 1).toInt()

    /**
     * Closes every unfinished earlier day (rewards + penalty decision), then creates today's board once.
     * Safe to call any number of times (app start, screen open, alarm).
     */
    suspend fun ensureBoard(todayEpochDay: Long): List<QuestEntity> {
        val profile = dao.profile() ?: return emptyList()
        db.withTransaction {
            dao.unclosedBefore(todayEpochDay).forEach { closeDay(it) }
            if (dao.day(todayEpochDay) == null) {
                val penalty = dao.lastDayBefore(todayEpochDay)?.penaltyTomorrow == true
                val condition = condition()
                val due = Maintenance.due(Maintenance.defaults, dao.maintenance().associate { it.routineId to it.lastDoneEpochDay }, todayEpochDay)
                val inventory = Inventory(profile.hasSunscreen, profile.hasTapeMeasure, profile.hasArmband)
                val quests = BoardGenerator.generate(dayNumber(profile, todayEpochDay).coerceAtLeast(1), condition, inventory, due, penalty)
                dao.insertQuests(quests.map { QuestEntity.from(todayEpochDay, it) })
                dao.upsertDay(DayEntity(todayEpochDay, condition.name))
            }
        }
        return dao.questsFor(todayEpochDay)
    }

    private suspend fun closeDay(day: DayEntity) {
        val rows = dao.questsFor(day.epochDay)
        val result = DayCloser.close(rows.map { it.toQuest() }, rows.associate { it.questId to it.progress })
        dao.upsertDay(day.copy(closed = true, goldEarned = result.goldEarned, expEarned = result.expEarned,
            penaltyTomorrow = result.penaltyTomorrow, mainDone = result.mainDone, mainTotal = result.mainTotal))
        val w = wallet()
        val exp = (w.exp + result.expEarned).coerceAtMost(Progression.expCap(w.level))
        dao.upsertWallet(w.copy(exp = exp, gold = w.gold + result.goldEarned))
    }

    private suspend fun condition(): Condition {
        val sleep = dao.latest(MeasureType.SLEEP_H)?.takeIf { nowMs() - it.tMs < DAY_MS }
        return Progression.conditionFromSleep(sleep?.value)
    }

    fun board(epochDay: Long): Flow<List<QuestEntity>> = dao.questsFlow(epochDay)

    suspend fun addProgress(epochDay: Long, questId: String, amount: Int) {
        val q = dao.quest(epochDay, questId) ?: return
        val p = (q.progress + amount).coerceIn(0, q.target)
        dao.upsertQuest(q.copy(progress = p, done = p >= q.target))
    }

    suspend fun complete(epochDay: Long, questId: String) {
        val q = dao.quest(epochDay, questId) ?: return
        dao.upsertQuest(q.copy(progress = q.target, done = true))
    }

    suspend fun logMeasurement(type: String, value: Double) =
        dao.insertMeasurement(MeasurementEntity(type = type, value = value, tMs = nowMs()))

    suspend fun latest(type: String): MeasurementEntity? = dao.latest(type)
    fun recent(type: String, n: Int) = dao.recent(type, n)

    /** Total of today's entries for additive types such as water. */
    suspend fun todayTotal(type: String, todayEpochDay: Long): Double {
        val start = LocalDate.ofEpochDay(todayEpochDay).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        return dao.since(type, start).sumOf { it.value }
    }

    suspend fun wallet(): WalletEntity = dao.wallet() ?: WalletEntity().also { dao.upsertWallet(it) }
    fun walletFlow() = dao.walletFlow()

    suspend fun markMaintenanceDone(routineId: String, todayEpochDay: Long) {
        dao.upsertMaintenance(MaintenanceEntity(routineId, todayEpochDay))
        complete(todayEpochDay, "mt_$routineId")
    }

    fun maintenanceFlow() = dao.maintenanceFlow()

    suspend fun saveJournal(epochDay: Long, text: String, emotion: String) = dao.upsertJournal(JournalEntity(epochDay, text, emotion))
    suspend fun journal(epochDay: Long) = dao.journal(epochDay)

    suspend fun logMeal(m: MealLogEntity) = dao.insertMeal(m)
    fun meals(epochDay: Long) = dao.mealsFlow(epochDay)

    fun recentDays(n: Int) = dao.recentDays(n)

    private companion object {
        const val DAY_MS = 24L * 60 * 60 * 1000
    }
}
