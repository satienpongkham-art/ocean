package com.lifesystem.app.data

import androidx.room.withTransaction
import com.lifesystem.engine.achievements.Achievements
import com.lifesystem.engine.achievements.History
import com.lifesystem.engine.boss.Boss
import com.lifesystem.engine.economy.BuyCheck
import com.lifesystem.engine.economy.ShopCatalog
import com.lifesystem.engine.economy.Slot
import com.lifesystem.engine.economy.Vault
import com.lifesystem.engine.job.Job
import com.lifesystem.engine.job.JobRules
import com.lifesystem.engine.model.Metrics
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.stats.StatRanks
import java.time.LocalDate
import java.time.ZoneId

/* Round 1.5 game systems: consumables, shop, vault, titles, class, boss. All rules come from the engine. */

private const val DAY_MS = 24L * 60 * 60 * 1000

internal fun startOfDayMs(epochDay: Long): Long = LocalDate.ofEpochDay(epochDay).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()

// ---------- stat ranks ----------

suspend fun Repository.ranks(): Map<Stat, Rank> {
    val p = profile()
    val pushup = latest(MeasureType.PUSHUP_MAX)?.value?.toInt()
    val str = StatRanks.str(pushup)
    return mapOf(
        Stat.STR to str,
        Stat.VIT to StatRanks.vit(latest(MeasureType.WAIST)?.value, p?.heightCm ?: 0.0, str),
        Stat.AGI to StatRanks.agi(latest(MeasureType.ROPE_SEC)?.value?.toInt()),
        Stat.CHA to Rank.UNKNOWN,
        Stat.MND to Rank.UNKNOWN,
        Stat.INT to Rank.UNKNOWN,
    )
}

/** Waist lost since the first measurement (for the avatar stage). */
suspend fun Repository.waistDrop(): Double? {
    val first = dao.earliest(MeasureType.WAIST)?.value ?: return null
    val now = latest(MeasureType.WAIST)?.value ?: return null
    return first - now
}

// ---------- items ----------

suspend fun Repository.addConsumable(id: String, n: Int) {
    val cur = dao.ownedItem(id)
    dao.upsertOwned(OwnedItemEntity(id, ItemKind.CONSUMABLE, (cur?.qty ?: 0) + n))
}

private suspend fun Repository.takeConsumable(id: String): Boolean {
    val cur = dao.ownedItem(id) ?: return false
    if (cur.qty <= 0) return false
    if (cur.qty == 1) dao.deleteOwned(id) else dao.upsertOwned(cur.copy(qty = cur.qty - 1))
    return true
}

suspend fun Repository.qty(id: String): Int = dao.ownedItem(id)?.qty ?: 0

/** EXP ×2 for an open day, once. */
suspend fun Repository.useExpScroll(epochDay: Long): Boolean = db.withTransaction {
    val d = dao.day(epochDay) ?: return@withTransaction false
    if (d.closed || d.expMultiplier > 1.0 || !takeConsumable("EXP_SCROLL")) return@withTransaction false
    dao.upsertDay(d.copy(expMultiplier = 2.0)); true
}

/** Skip an open day: no penalty, no reward. */
suspend fun Repository.useRestTicket(epochDay: Long): Boolean = db.withTransaction {
    val d = dao.day(epochDay) ?: return@withTransaction false
    if (d.closed || d.rest || !takeConsumable("REST_TICKET")) return@withTransaction false
    dao.upsertDay(d.copy(rest = true)); true
}

/** Cancel today's penalty quests; at most once per calendar month. */
suspend fun Repository.usePenaltyShield(epochDay: Long): Boolean = db.withTransaction {
    val mark = "shield_used_" + LocalDate.ofEpochDay(epochDay).let { "%04d%02d".format(it.year, it.monthValue) }
    val penalties = dao.questsFor(epochDay).filter { it.type == QuestType.PENALTY.name }
    if (penalties.isEmpty() || dao.ownedItem(mark) != null || !takeConsumable("PENALTY_SHIELD")) return@withTransaction false
    penalties.forEach { dao.deleteQuest(it.epochDay, it.questId) }
    dao.upsertOwned(OwnedItemEntity(mark, "MARK", 1)); true
}

// ---------- shop ----------

internal suspend fun Repository.upsertWalletGold(gold: Int) = dao.upsertWallet(wallet().copy(gold = gold))
internal suspend fun Repository.upsertWalletExp(exp: Int) = dao.upsertWallet(wallet().copy(exp = exp))

suspend fun Repository.ownedIds(): Set<String> = dao.owned().map { it.id }.toSet()

suspend fun Repository.buyCosmetic(id: String): BuyCheck = db.withTransaction {
    val item = ShopCatalog.byId(id) ?: return@withTransaction BuyCheck.NotEnough(0)
    if (!item.buyable) return@withTransaction BuyCheck.NotEnough(0)
    val w = wallet()
    val check = ShopCatalog.check(item, w.gold, qty("COSMETIC_SHARD"), ranks(), ownedIds())
    if (check == BuyCheck.Ok) {
        if (item.priceShards > 0) repeat(item.priceShards) { takeConsumable("COSMETIC_SHARD") }
        else dao.upsertWallet(w.copy(gold = w.gold - item.priceG))
        dao.upsertOwned(OwnedItemEntity(id, ItemKind.COSMETIC, 1))
    }
    check
}

/** Equip an owned cosmetic (or clear the slot with null). */
suspend fun Repository.equip(slot: Slot, id: String?) {
    val p = profile() ?: return
    if (id != null && (id !in ownedIds() || ShopCatalog.byId(id)?.slot != slot)) return
    saveProfile(when (slot) {
        Slot.OUTFIT -> p.copy(outfit = id)
        Slot.WEAPON -> p.copy(weapon = id)
        Slot.AURA -> p.copy(aura = id)
    })
}

suspend fun Repository.equipTitle(id: String?) {
    val p = profile() ?: return
    if (id != null && dao.achievements().none { it.id == id }) return
    saveProfile(p.copy(titleId = id))
}

/** Class change at level 10; grants the class outfit. */
suspend fun Repository.chooseJob(job: Job): Boolean {
    val p = profile() ?: return false
    if (!JobRules.eligible(wallet().level) || p.job != null) return false
    val outfit = "job_${job.name.lowercase()}"
    dao.upsertOwned(OwnedItemEntity(outfit, ItemKind.COSMETIC, 1))
    saveProfile(p.copy(job = job.name, outfit = outfit))
    return true
}

// ---------- vault & real rewards ----------

suspend fun Repository.deposit(amount: Int, note: String) {
    if (amount <= 0) return
    dao.insertVault(VaultEntryEntity(tMs = nowMs(), amount = amount, note = note))
}

suspend fun Repository.addReward(name: String, price: Int, twinCosmetic: String? = null): Long =
    dao.insertReward(RewardEntity(name = name.trim(), price = price, twinCosmetic = twinCosmetic))

suspend fun Repository.redeemReward(id: Long): Boolean = db.withTransaction {
    val r = dao.reward(id) ?: return@withTransaction false
    if (r.redeemedMs != null || !Vault.canRedeem(dao.vaultBalance(), r.price)) return@withTransaction false
    dao.insertVault(VaultEntryEntity(tMs = nowMs(), amount = -r.price, note = "แลก: ${r.name}"))
    dao.upsertReward(r.copy(redeemedMs = nowMs()))
    r.twinCosmetic?.let { dao.upsertOwned(OwnedItemEntity(it, ItemKind.COSMETIC, 1)) }
    true
}

// ---------- achievements ----------

internal suspend fun Repository.refreshAchievements(todayEpochDay: Long) {
    val days = dao.closedDays()
    val quests = dao.closedQuests().groupBy { it.epochDay }
    val history = History(
        doneByDay = days.map { d -> quests[d.epochDay].orEmpty().filter { it.progress >= it.target }.map { it.questId }.toSet() },
        fullClearByDay = days.map { it.mainTotal > 0 && it.mainDone == it.mainTotal && !it.penaltyTomorrow && !it.rest },
        totalReps = mapOf("pushup" to quests.values.flatten().filter { it.questId == "pushup" || it.questId == "penalty" || it.questId.endsWith("_pushup") }.sumOf { it.progress }),
        gatesCleared = days.sumOf { it.gatesCleared },
        bossesDefeated = dao.bossesDefeated(),
        menusEaten = dao.distinctMenus(),
    )
    Achievements.unlocked(history).forEach { dao.insertAchievement(AchievementEntity(it, todayEpochDay)) }
}

// ---------- weekly boss ----------

/** Fights this week's boss once per boss day (repeat calls return the stored result without re-applying). */
suspend fun Repository.fightBoss(epochDay: Long): Boss.Outcome = db.withTransaction {
    val start = startOfDayMs(epochDay)
    fun List<MeasurementEntity>.avg() = takeIf { it.isNotEmpty() }?.map { it.value }?.average()
    suspend fun before(type: String) = dao.measurementsBetween(type, 0, start)
    suspend fun today(type: String) = dao.measurementsBetween(type, start, start + DAY_MS)
    val best = Metrics(
        weightAvg7 = dao.measurementsBetween(MeasureType.WEIGHT, start - 14 * DAY_MS, start - 7 * DAY_MS).avg(),
        waistCm = before(MeasureType.WAIST).minOfOrNull { it.value },
        pushupMax = before(MeasureType.PUSHUP_MAX).maxOfOrNull { it.value }?.toInt(),
        plankSec = before(MeasureType.PLANK_SEC).maxOfOrNull { it.value }?.toInt(),
        ropeSec = null, sleepAvg7h = null, weightAvg7PrevWeek = null,
    )
    val prevWeek = best.weightAvg7
    val now = Metrics(
        weightAvg7 = dao.measurementsBetween(MeasureType.WEIGHT, start - 6 * DAY_MS, start + DAY_MS).avg(),
        waistCm = today(MeasureType.WAIST).lastOrNull()?.value,
        pushupMax = today(MeasureType.PUSHUP_MAX).maxOfOrNull { it.value }?.toInt(),
        plankSec = today(MeasureType.PLANK_SEC).maxOfOrNull { it.value }?.toInt(),
        ropeSec = null,
        sleepAvg7h = dao.measurementsBetween(MeasureType.SLEEP_H, start - 7 * DAY_MS, start + DAY_MS).avg(),
        weightAvg7PrevWeek = prevWeek,
    )
    val w = wallet()
    val outcome = Boss.fight(w.level, w.exp, best, now)
    if (dao.boss(epochDay) == null) {
        dao.upsertBoss(BossResultEntity(epochDay, outcome.damage, outcome.defeated, outcome.improved.joinToString(",")))
        if (outcome.defeated) {
            val (level, exp) = Boss.levelUp(w.level, w.exp)
            dao.upsertWallet(w.copy(level = level, exp = exp))
        }
    }
    outcome
}
