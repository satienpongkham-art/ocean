package com.lifesystem.engine.model

object EngineInfo {
    const val VERSION = "0.1.0"
}

/** Body condition derived from last night's sleep (replaces "HP"). */
enum class Condition { OPTIMAL, NORMAL, FATIGUED }

/** Ordered from lowest to highest; UNKNOWN = not measured yet. */
enum class Rank { E, D, C, B, A, S, UNKNOWN }

enum class QuestType { DAILY_MAIN, DAILY_SIDE, PENALTY, MAINTENANCE, CHAIN, GATE, BOSS, EMERGENCY }

/** How the System verifies completion. */
enum class Verify { SENSOR, AUTO, NUMBER, PHOTO, SELF }

enum class Group { MORNING, DAY, TRAINING, NIGHT }

enum class Stat { STR, VIT, AGI, CHA, MND, INT, GOLD }

data class Quest(
    val id: String,
    val title: String,
    val stat: Stat,
    val type: QuestType,
    val group: Group,
    val verify: Verify,
    val target: Int,
    val unit: String,
    val exp: Int,
    val gold: Int,
    /** Gate window in minutes of day; progress only counts inside it. Null = all day. */
    val openMin: Int? = null,
    val closeMin: Int? = null,
) {
    /** Quests that must be finished today or a penalty follows. */
    val required: Boolean get() = type != QuestType.DAILY_SIDE && type != QuestType.BOSS

    /** Round 2 rule R2.1: only core quests cause a penalty when missed. */
    val core: Boolean get() = id in CORE_IDS || type == QuestType.PENALTY || type == QuestType.GATE || type == QuestType.EMERGENCY

    companion object {
        val CORE_IDS = setOf("wake", "weigh", "pushup", "squat", "journal", "sleep")
    }
}

data class Inventory(val hasSunscreen: Boolean, val hasTapeMeasure: Boolean, val hasArmband: Boolean)

enum class Sex { MALE, FEMALE }

enum class MealSlot { BREAKFAST, LUNCH, DINNER, SNACK }

/** Menu entry; kcal/protein/price are estimates (±20 %). [order] is what to say to the shop. */
data class MenuItem(
    val id: String,
    val slot: MealSlot,
    val name: String,
    val order: String,
    val kcal: Int,
    val protein: Int,
    val price: Int,
    val sprite: String,
)

/** One snapshot of measurable progress. Null = not measured. */
data class Metrics(
    val weightAvg7: Double?,
    val waistCm: Double?,
    val pushupMax: Int?,
    val plankSec: Int?,
    val ropeSec: Int?,
    val sleepAvg7h: Double?,
    val weightAvg7PrevWeek: Double?,
)
