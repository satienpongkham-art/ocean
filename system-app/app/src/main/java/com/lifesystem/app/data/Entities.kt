package com.lifesystem.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.lifesystem.engine.model.Group
import com.lifesystem.engine.model.Quest
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.model.Verify

@Entity(tableName = "profile")
data class ProfileEntity(
    @PrimaryKey val id: Int = 1,
    val name: String,
    val age: Int,
    val sex: String,
    val heightCm: Double,
    val day0EpochDay: Long,
    val wakeMin: Int = 7 * 60,
    val sleepMin: Int = 23 * 60,
    /** Comma-separated minutes of day: breakfast, lunch, dinner, snack. */
    val mealTimes: String = "450,720,1080,1200",
    val weeklyBudget: Int = 2000,
    val goalWeightKg: Double? = null,
    val hasSunscreen: Boolean = false,
    val hasTapeMeasure: Boolean = true,
    val hasArmband: Boolean = false,
    // v2: equipped title / class / cosmetics (ids from the engine catalogs)
    val titleId: String? = null,
    val job: String? = null,
    val outfit: String? = null,
    val weapon: String? = null,
    val aura: String? = null,
) {
    fun mealMinutes(): List<Int> = mealTimes.split(',').mapNotNull { it.trim().toIntOrNull() }
    val dailyBudget: Int get() = weeklyBudget / 7
}

@Entity(tableName = "quest", primaryKeys = ["epochDay", "questId"])
data class QuestEntity(
    val epochDay: Long,
    val questId: String,
    val title: String,
    val stat: String,
    val type: String,
    val grp: String,
    val verify: String,
    val target: Int,
    val unit: String,
    val exp: Int,
    val gold: Int,
    val progress: Int = 0,
    val done: Boolean = false,
    /** Injury stop already used today (once per quest per day). */
    val excused: Boolean = false,
    /** v2: gate window, minutes of day (null = all day). */
    val openMin: Int? = null,
    val closeMin: Int? = null,
) {
    fun toQuest() = Quest(questId, title, Stat.valueOf(stat), QuestType.valueOf(type), Group.valueOf(grp), Verify.valueOf(verify), target, unit, exp, gold, openMin, closeMin)

    /** Whether progress may be added at [minuteOfDay] (gate windows only). */
    fun openAt(minuteOfDay: Int): Boolean {
        val o = openMin ?: return true
        val c = closeMin ?: return true
        return minuteOfDay in o until c
    }

    companion object {
        fun from(day: Long, q: Quest) = QuestEntity(day, q.id, q.title, q.stat.name, q.type.name, q.group.name, q.verify.name, q.target, q.unit, q.exp, q.gold, openMin = q.openMin, closeMin = q.closeMin)
    }
}

@Entity(tableName = "day")
data class DayEntity(
    @PrimaryKey val epochDay: Long,
    val condition: String,
    val closed: Boolean = false,
    val goldEarned: Int = 0,
    val expEarned: Int = 0,
    val penaltyTomorrow: Boolean = false,
    val mainDone: Int = 0,
    val mainTotal: Int = 0,
    // v2
    /** EXP multiplier for this day (EXP scroll = 2.0). */
    val expMultiplier: Double = 1.0,
    /** Rest ticket used: no penalty and no reward for this day. */
    val rest: Boolean = false,
    val gatesCleared: Int = 0,
    // v3
    val coreMisses: Int = 0,
)

@Entity(tableName = "measurement")
data class MeasurementEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: String,
    val value: Double,
    val tMs: Long,
)

@Entity(tableName = "meal_log")
data class MealLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val epochDay: Long,
    val slot: String,
    val menuId: String?,
    val kcal: Int,
    val protein: Int,
    val price: Int,
)

@Entity(tableName = "maintenance")
data class MaintenanceEntity(@PrimaryKey val routineId: String, val lastDoneEpochDay: Long)

@Entity(tableName = "journal")
data class JournalEntity(@PrimaryKey val epochDay: Long, val text: String, val emotion: String)

@Entity(tableName = "wallet")
data class WalletEntity(@PrimaryKey val id: Int = 1, val exp: Int = 0, val level: Int = 1, val gold: Int = 0)

/** Owned cosmetics (qty 1) and consumables (EXP_SCROLL, REST_TICKET, PENALTY_SHIELD, COSMETIC_SHARD). */
@Entity(tableName = "owned_item")
data class OwnedItemEntity(@PrimaryKey val id: String, val kind: String, val qty: Int)

/** Append-only VAULT ledger: + real savings deposited, − rewards redeemed. */
@Entity(tableName = "vault_entry")
data class VaultEntryEntity(@PrimaryKey(autoGenerate = true) val id: Long = 0, val tMs: Long, val amount: Int, val note: String)

/** A real-life reward the player set, optionally TWIN-linked to a cosmetic. */
@Entity(tableName = "reward")
data class RewardEntity(@PrimaryKey(autoGenerate = true) val id: Long = 0, val name: String, val price: Int, val twinCosmetic: String? = null, val redeemedMs: Long? = null)

@Entity(tableName = "achievement")
data class AchievementEntity(@PrimaryKey val id: String, val epochDay: Long)

@Entity(tableName = "boss_result")
data class BossResultEntity(@PrimaryKey val epochDay: Long, val damage: Int, val defeated: Boolean, val improved: String)

/** v3: simple key/value settings and per-day flags. */
@Entity(tableName = "setting")
data class SettingEntity(@PrimaryKey val key: String, val value: String)

/** v3: every progress increment with its time (Shadow Run compares with the same time last week). */
@Entity(tableName = "progress_log")
data class ProgressLogEntity(@PrimaryKey(autoGenerate = true) val id: Long = 0, val epochDay: Long, val questId: String, val tMs: Long, val amount: Int)

/** v3: quick expense log (2 taps: amount + category). */
@Entity(tableName = "expense")
data class ExpenseEntity(@PrimaryKey(autoGenerate = true) val id: Long = 0, val epochDay: Long, val tMs: Long, val amount: Int, val category: String)

object ItemKind {
    const val COSMETIC = "COSMETIC"
    const val CONSUMABLE = "CONSUMABLE"
}

object MeasureType {
    const val WEIGHT = "weight"
    const val WAIST = "waist"
    const val WATER_ML = "water_ml"
    const val SLEEP_H = "sleep_h"
    const val PUSHUP_MAX = "pushup_max"
    const val PLANK_SEC = "plank_sec"
    const val ROPE_SEC = "rope_sec"
    const val STEPS = "steps"
}
