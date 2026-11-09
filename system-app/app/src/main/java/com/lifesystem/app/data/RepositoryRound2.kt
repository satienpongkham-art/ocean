package com.lifesystem.app.data

import androidx.room.withTransaction
import com.lifesystem.engine.chapters.ChapterProgress
import com.lifesystem.engine.chapters.Chapters
import com.lifesystem.engine.model.Group
import com.lifesystem.engine.model.Quest
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.model.Verify
import com.lifesystem.engine.report.DaySummary
import com.lifesystem.engine.report.Report
import com.lifesystem.engine.report.ReportCard
import com.lifesystem.engine.skills.SkillInput
import java.time.LocalDate

/* Round 2: settings, money penalty, expenses, sick days, chapters, weekly report, skills input. */

object Keys {
    const val SOUND = "sound_on"
    const val SCREEN_BOSS = "screen_boss_on"
    const val SCREEN_CAP = "screen_cap_min"
    const val LOCK_ON = "lock_on"
    const val LOCK_APPS = "lock_apps"
    const val LOCK_TRAINING_FROM = "lock_training_from"
    const val WORK = "work_quests"
    const val POPUP_MEALS = "popup_meals"
    const val POPUP_SLEEP = "popup_sleep"
    const val POSTURE = "posture_on"
    const val TRUST = "trust"
    const val CHAPTERS = "chapters"
    const val CHAPTER_NEW = "chapter_new"
    const val REPORT_SEEN = "report_seen"
    fun nightOwl(day: Long) = "night_owl_$day"
    fun manualSleep(day: Long) = "manual_sleep_$day"
    fun screenAfterBed(day: Long) = "screen_after_bed_$day"
    fun sickMonth(day: Long) = LocalDate.ofEpochDay(day).let { "sick_%04d%02d".format(it.year, it.monthValue) }
}

suspend fun Repository.getSetting(key: String, default: String): String = dao.setting(key) ?: default
suspend fun Repository.putSetting(key: String, value: String) = dao.putSetting(SettingEntity(key, value))
suspend fun Repository.getInt(key: String, default: Int): Int = dao.setting(key)?.toIntOrNull() ?: default
suspend fun Repository.getBool(key: String, default: Boolean): Boolean = dao.setting(key)?.let { it == "1" } ?: default
suspend fun Repository.putBool(key: String, value: Boolean) = putSetting(key, if (value) "1" else "0")

data class WorkQuest(val title: String, val target: Int)

/** "title|target" per line. */
fun parseWork(s: String): List<WorkQuest> = s.lines().mapNotNull { line ->
    val parts = line.split('|')
    val title = parts.getOrNull(0)?.trim().orEmpty()
    if (title.isEmpty()) null else WorkQuest(title, parts.getOrNull(1)?.trim()?.toIntOrNull()?.coerceAtLeast(1) ?: 1)
}

/** App-level quests added to every board: work quests from settings, focus dungeon, screen-time boss. */
internal suspend fun Repository.extraQuests(): List<Quest> = buildList {
    parseWork(getSetting(Keys.WORK, "")).forEachIndexed { i, w ->
        add(Quest("work_$i", w.title, Stat.GOLD, QuestType.DAILY_MAIN, Group.DAY, Verify.SELF, w.target, "ครั้ง", 20, 4))
    }
    add(Quest("focus", "Focus Dungeon 25 นาที", Stat.INT, QuestType.DAILY_SIDE, Group.DAY, Verify.AUTO, 2, "รอบ", 15, 2))
    if (getBool(Keys.SCREEN_BOSS, false)) {
        add(Quest("screen_cap", "Screen-time Boss · โซเชียล/เกม ≤ ${getInt(Keys.SCREEN_CAP, 120)} นาที", Stat.MND, QuestType.DAILY_MAIN, Group.NIGHT, Verify.AUTO, 1, "", 25, 4))
    }
}

/** Pay the money penalty: logs the deposit in VAULT and completes the quest. */
suspend fun Repository.payPenaltyFund(epochDay: Long): Boolean {
    val q = dao.quest(epochDay, "penalty_fund") ?: return false
    if (q.done) return false
    val amount = q.unit.filter(Char::isDigit).toIntOrNull() ?: return false
    deposit(amount, "เงินลงโทษ")
    complete(epochDay, "penalty_fund")
    return true
}

suspend fun Repository.addExpense(epochDay: Long, amount: Int, category: String) {
    if (amount <= 0) return
    dao.insertExpense(ExpenseEntity(epochDay = epochDay, tMs = nowMs(), amount = amount, category = category))
}

/** Sick day: today counts for nothing (no penalty, no lock); at most 2 per calendar month. */
suspend fun Repository.useSickDay(epochDay: Long): Boolean = db.withTransaction {
    val d = dao.day(epochDay) ?: return@withTransaction false
    val key = Keys.sickMonth(epochDay)
    val used = getInt(key, 0)
    if (d.closed || d.rest || used >= 2) return@withTransaction false
    dao.upsertDay(d.copy(rest = true))
    putSetting(key, (used + 1).toString())
    true
}

suspend fun Repository.isRestDay(epochDay: Long): Boolean = dao.day(epochDay)?.rest == true

private fun maxStreak(flags: List<Boolean>): Int {
    var best = 0; var cur = 0
    flags.forEach { if (it) { cur++; best = maxOf(best, cur) } else cur = 0 }
    return best
}

internal suspend fun Repository.questStreak(questId: String): Int {
    val days = dao.closedDays()
    val done = dao.closedQuests().filter { it.questId == questId && it.progress >= it.target }.map { it.epochDay }.toSet()
    return maxStreak(days.map { it.epochDay in done })
}

internal suspend fun Repository.coreStreak(): Int = maxStreak(dao.closedDays().map { it.coreMisses == 0 && !it.rest })

suspend fun Repository.skillInput(): SkillInput {
    val all = dao.closedQuests() + dao.questsFor(com.lifesystem.app.SystemApp.today())
    suspend fun maxOf(type: String) = dao.measurementsBetween(type, 0, Long.MAX_VALUE).maxOfOrNull { it.value }?.toInt()
    return SkillInput(
        pushupMax = maxOf(MeasureType.PUSHUP_MAX), plankSec = maxOf(MeasureType.PLANK_SEC), ropeSec = maxOf(MeasureType.ROPE_SEC),
        maxSteps = all.filter { it.questId == "steps" }.maxOfOrNull { it.progress } ?: 0,
        wakeStreak = questStreak("wake"), readStreak = questStreak("read"), journalStreak = questStreak("journal"),
        focusSessions = all.filter { it.questId == "focus" }.sumOf { it.progress },
    )
}

/** Unlock new story chapters and grant their rewards; the newest one is flagged for a popup. */
internal suspend fun Repository.refreshChapters() {
    val seen = getSetting(Keys.CHAPTERS, "").split(',').filter { it.isNotBlank() }.map { it.toInt() }.toSet()
    val p = ChapterProgress(
        coreStreakMax = coreStreak(), level = wallet().level, bossesDefeated = dao.bossesDefeated(),
        gatesCleared = dao.closedDays().sumOf { it.gatesCleared }, daysPlayed = dao.closedDays().size,
    )
    val fresh = Chapters.unlocked(p).filter { it !in seen }
    if (fresh.isEmpty()) return
    fresh.forEach { n ->
        val c = Chapters.all.first { it.n == n }
        if (c.rewardG > 0) dao.upsertWallet(wallet().let { it.copy(gold = it.gold + c.rewardG) })
        c.rewardItem?.let { addConsumable(it, 1) }
    }
    putSetting(Keys.CHAPTERS, (seen + fresh).sorted().joinToString(","))
    putSetting(Keys.CHAPTER_NEW, fresh.max().toString())
}

/** The Sunday report card over the 7 days before [todayEpochDay]. */
suspend fun Repository.weeklyReport(todayEpochDay: Long): Report {
    val days = dao.closedDays().filter { it.epochDay in (todayEpochDay - 7) until todayEpochDay }
    val quests = dao.closedQuests().groupBy { it.epochDay }
    val summaries = days.map { d ->
        val req = quests[d.epochDay].orEmpty().filter { it.toQuest().required && it.type != QuestType.GATE.name }
        DaySummary(d.epochDay, req.count { it.progress >= it.target }, req.size, req.filter { it.progress < it.target }.map { it.questId })
    }
    val from = startOfDayMs(todayEpochDay - 7); val to = startOfDayMs(todayEpochDay)
    suspend fun firstLast(type: String) = dao.measurementsBetween(type, from, to).let { it.firstOrNull()?.value to it.lastOrNull()?.value }
    return ReportCard.build(summaries, firstLast(MeasureType.WEIGHT), firstLast(MeasureType.WAIST))
}

/** Shadow Run (R2.10): last week's progress on this quest by the same time of day. */
suspend fun Repository.shadowNow(todayEpochDay: Long, questId: String): Int {
    val zone = java.time.ZoneId.systemDefault()
    val logs = dao.progressLog(todayEpochDay - 7, questId).map { l ->
        java.time.Instant.ofEpochMilli(l.tMs).atZone(zone).toLocalTime().let { it.hour * 60 + it.minute } to l.amount
    }
    return com.lifesystem.engine.shadow.Shadow.progressBy(logs, minuteOfDay())
}

/** Buffs/debuffs active today (R2.6). */
suspend fun Repository.effectsToday(todayEpochDay: Long): List<com.lifesystem.engine.effects.Effect> {
    val condition = runCatching { com.lifesystem.engine.model.Condition.valueOf(dao.day(todayEpochDay)?.condition ?: "NORMAL") }.getOrDefault(com.lifesystem.engine.model.Condition.NORMAL)
    val soda = dao.quest(todayEpochDay - 1, "no_soda")?.let { it.progress < it.target } ?: false
    return com.lifesystem.engine.effects.Effects.active(condition, soda, getBool(Keys.nightOwl(todayEpochDay), false))
}
