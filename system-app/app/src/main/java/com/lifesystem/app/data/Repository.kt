package com.lifesystem.app.data

import androidx.room.withTransaction
import com.lifesystem.engine.maintenance.Maintenance
import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.model.Inventory
import com.lifesystem.engine.progression.Progression
import com.lifesystem.engine.quest.BoardGenerator
import com.lifesystem.engine.quest.DayCloser
import com.lifesystem.engine.achievements.Achievements
import com.lifesystem.engine.boss.Boss
import com.lifesystem.engine.gate.GateGenerator
import com.lifesystem.engine.job.Job
import com.lifesystem.engine.job.JobRules
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.model.Verify
import com.lifesystem.engine.effects.Effects
import com.lifesystem.engine.emergency.EmergencyGenerator
import com.lifesystem.engine.shadow.Shadow
import com.lifesystem.engine.skills.SkillTree
import com.lifesystem.engine.trust.Trust
import kotlin.math.roundToInt
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

/** Single entry point for app state. All game rules come from the engine. */
class Repository(internal val db: SystemDb, internal val nowMs: () -> Long = System::currentTimeMillis) {
    internal val dao = db.dao()

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
        var closedAny = false
        db.withTransaction {
            dao.unclosedBefore(todayEpochDay).forEach { closeDay(it); closedAny = true }
            if (dao.day(todayEpochDay) == null) {
                val last = dao.lastDayBefore(todayEpochDay)
                val penalty = last?.penaltyTomorrow == true
                val condition = Effects.adjust(condition(), getBool(Keys.nightOwl(todayEpochDay), false))
                val due = Maintenance.due(Maintenance.defaults, dao.maintenance().associate { it.routineId to it.lastDoneEpochDay }, todayEpochDay)
                val inventory = Inventory(profile.hasSunscreen, profile.hasTapeMeasure, profile.hasArmband)
                val gates = GateGenerator.generate(todayEpochDay, wallet().level, profile.wakeMin, profile.sleepMin).flatMap(GateGenerator::quests)
                val dow = java.time.LocalDate.ofEpochDay(todayEpochDay).dayOfWeek
                val quests = BoardGenerator.generate(
                    dayNumber(profile, todayEpochDay).coerceAtLeast(1), condition, inventory, due, penalty,
                    bossDay = Boss.isBossDay(todayEpochDay),
                    penaltyFundBaht = if (penalty) DayCloser.penaltyFundBaht(last?.coreMisses ?: 0) else 0,
                    dumbbellDay = dow == java.time.DayOfWeek.MONDAY || dow == java.time.DayOfWeek.WEDNESDAY || dow == java.time.DayOfWeek.FRIDAY,
                ) + gates + listOfNotNull(EmergencyGenerator.generate(todayEpochDay, profile.wakeMin, profile.sleepMin)) + extraQuests()
                dao.insertQuests(quests.map { QuestEntity.from(todayEpochDay, it) })
                dao.upsertDay(DayEntity(todayEpochDay, condition.name))
            }
        }
        if (closedAny) { refreshAchievements(todayEpochDay); refreshChapters() }
        return dao.questsFor(todayEpochDay)
    }

    private suspend fun closeDay(day: DayEntity) {
        val profile = dao.profile()
        if (day.rest) {
            // Rest ticket / sick day: the day counts for nothing either way.
            dao.upsertDay(day.copy(closed = true, penaltyTomorrow = false, goldEarned = 0, expEarned = 0))
            return
        }
        // Expenses decide the budget quest when any were logged (rule: real numbers beat a self-tick).
        val spent = dao.spent(day.epochDay)
        val budgetTicked = dao.quest(day.epochDay, "budget")?.done == true
        val overBudget = dao.expenseCount(day.epochDay) > 0 && profile != null && spent > profile.dailyBudget
        if (dao.expenseCount(day.epochDay) > 0) dao.setProgress(day.epochDay, "budget", if (overBudget) 0 else 1)

        val rows = dao.questsFor(day.epochDay)
        val graceDay = profile?.day0EpochDay == day.epochDay
        val result = DayCloser.close(rows.map { it.toQuest() }, rows.associate { it.questId to it.progress }, graceDay)
        fun done(q: QuestEntity) = q.progress >= q.target

        val gates = rows.filter { it.type == QuestType.GATE.name }.groupBy { it.questId.substringBefore('_').removePrefix("gate").toIntOrNull() ?: 0 }
        val cleared = gates.filterValues { qs -> qs.all { it.progress >= it.target } }.keys
        cleared.forEach { addConsumable(GateGenerator.drop(day.epochDay, it).name, 1) }
        rows.firstOrNull { it.type == QuestType.EMERGENCY.name && done(it) }?.let { addConsumable(GateGenerator.drop(day.epochDay, 9).name, 1) }

        // Trust (R2.7)
        val contradictions = (if (budgetTicked && overBudget) 1 else 0) +
            Trust.contradictions(false, false, getBool(Keys.manualSleep(day.epochDay), false), getBool(Keys.screenAfterBed(day.epochDay), false))
        val trust = Trust.update(getInt(Keys.TRUST, Trust.START), contradictions)
        putSetting(Keys.TRUST, trust.toString())

        // EXP: base + job + skills + trust on self quests, then buffs/debuffs and EXP scroll
        val condition = runCatching { Condition.valueOf(day.condition) }.getOrDefault(Condition.NORMAL)
        val doneRows = rows.filter(::done)
        val jobStat = profile?.job?.let { j -> runCatching { Job.valueOf(j).stat.name }.getOrNull() }
        val jobExtra = if (jobStat == null) 0.0 else doneRows.filter { it.stat == jobStat }.sumOf { it.exp } * JobRules.EXP_BONUS
        val skills = SkillTree.unlocked(skillInput())
        val skillExtra = doneRows.sumOf { q -> q.exp * runCatching { SkillTree.expBonus(skills, Stat.valueOf(q.stat)) }.getOrDefault(0.0) }
        val trustExtra = doneRows.filter { it.verify == Verify.SELF.name }.sumOf { it.exp } * (Trust.selfMultiplier(trust) - 1)
        val sodaYesterday = dao.quest(day.epochDay - 1, "no_soda")?.let { !done(it) } ?: false
        val effects = Effects.active(condition, sodaYesterday, getBool(Keys.nightOwl(day.epochDay), false))
        val earned = ((result.expEarned + jobExtra + skillExtra + trustExtra) * Effects.multiplier(effects) * day.expMultiplier).toInt().coerceAtLeast(0)

        // Gold: quests + title bonus + Shadow Run (R2.10)
        val shadow = Shadow.RACED.count { id ->
            val today = rows.firstOrNull { it.questId == id }?.progress ?: 0
            val lastWeek = dao.quest(day.epochDay - 7, id)?.progress ?: 0
            Shadow.beats(today, lastWeek)
        } * Shadow.BONUS_G
        val gold = (result.goldEarned * (1 + if (profile?.titleId != null) Achievements.TITLE_GOLD_BONUS else 0.0)).roundToInt() + shadow

        val w = wallet()
        val exp = (w.exp + earned).coerceAtMost(Progression.expCap(w.level))
        dao.upsertDay(day.copy(closed = true, goldEarned = gold, expEarned = earned, gatesCleared = cleared.size, coreMisses = result.coreMisses,
            penaltyTomorrow = result.penaltyTomorrow, mainDone = result.mainDone, mainTotal = result.mainTotal))
        dao.upsertWallet(w.copy(exp = exp, gold = w.gold + gold))
    }

    private suspend fun condition(): Condition {
        val sleep = dao.latest(MeasureType.SLEEP_H)?.takeIf { nowMs() - it.tMs < DAY_MS }
        return Progression.conditionFromSleep(sleep?.value)
    }

    fun board(epochDay: Long): Flow<List<QuestEntity>> = dao.questsFlow(epochDay)
    suspend fun quest(epochDay: Long, questId: String): QuestEntity? = dao.quest(epochDay, questId)

    /** Adds progress; gate quests only accept it inside their window. */
    suspend fun addProgress(epochDay: Long, questId: String, amount: Int) {
        val q = dao.quest(epochDay, questId) ?: return
        if (!q.openAt(minuteOfDay())) return
        dao.addProgress(epochDay, questId, amount)
        if (amount > 0) dao.insertProgressLog(ProgressLogEntity(epochDay = epochDay, questId = questId, tMs = nowMs(), amount = amount))
    }

    /** Sets absolute progress (e.g. today's step total from Health Connect). */
    suspend fun setProgress(epochDay: Long, questId: String, value: Int) {
        val before = dao.quest(epochDay, questId)?.progress ?: return
        dao.setProgress(epochDay, questId, value)
        if (value > before) dao.insertProgressLog(ProgressLogEntity(epochDay = epochDay, questId = questId, tMs = nowMs(), amount = value - before))
    }

    internal fun minuteOfDay(): Int = java.time.Instant.ofEpochMilli(nowMs()).atZone(java.time.ZoneId.systemDefault()).toLocalTime().let { it.hour * 60 + it.minute }

    /**
     * Injury stop: halve what is left of today's target (spec §6.4).
     * Once per quest per day, and at least one rep always stays, so it can never complete a quest by itself.
     */
    suspend fun reduceRemaining(epochDay: Long, questId: String) {
        val q = dao.quest(epochDay, questId) ?: return
        if (q.excused || q.done) return
        val newTarget = maxOf(q.progress + 1, q.progress + (q.target - q.progress) / 2).coerceAtMost(q.target)
        dao.upsertQuest(q.copy(target = newTarget, excused = true))
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

    /** At install, treat every routine as just done so Day 1 is not flooded; existing rows are kept. */
    suspend fun seedMaintenance(todayEpochDay: Long) =
        dao.insertMaintenanceIfMissing(Maintenance.defaults.map { MaintenanceEntity(it.id, todayEpochDay) })

    suspend fun setHasSunscreen() {
        val p = dao.profile() ?: return
        dao.upsertProfile(p.copy(hasSunscreen = true))
    }

    suspend fun saveJournal(epochDay: Long, text: String, emotion: String) = dao.upsertJournal(JournalEntity(epochDay, text, emotion))
    suspend fun journal(epochDay: Long) = dao.journal(epochDay)

    /** Logs a meal and updates "protein every meal" (meals reaching the per-meal protein bar). */
    suspend fun logMeal(m: MealLogEntity) {
        dao.insertMeal(m)
        val enough = dao.meals(m.epochDay).count { it.protein >= BoardGenerator.PROTEIN_PER_MEAL_G }
        dao.setProgress(m.epochDay, "protein_meals", enough)
    }
    fun meals(epochDay: Long) = dao.mealsFlow(epochDay)

    fun recentDays(n: Int) = dao.recentDays(n)

    private companion object {
        const val DAY_MS = 24L * 60 * 60 * 1000
    }
}
