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
) {
    fun toQuest() = Quest(questId, title, Stat.valueOf(stat), QuestType.valueOf(type), Group.valueOf(grp), Verify.valueOf(verify), target, unit, exp, gold)

    companion object {
        fun from(day: Long, q: Quest) = QuestEntity(day, q.id, q.title, q.stat.name, q.type.name, q.group.name, q.verify.name, q.target, q.unit, q.exp, q.gold)
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

object MeasureType {
    const val WEIGHT = "weight"
    const val WAIST = "waist"
    const val WATER_ML = "water_ml"
    const val SLEEP_H = "sleep_h"
    const val PUSHUP_MAX = "pushup_max"
    const val PLANK_SEC = "plank_sec"
    const val ROPE_SEC = "rope_sec"
}
