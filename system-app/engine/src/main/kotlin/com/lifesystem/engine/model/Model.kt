package com.lifesystem.engine.model

object EngineInfo {
    const val VERSION = "0.1.0"
}

/** Body condition derived from last night's sleep (replaces "HP"). */
enum class Condition { OPTIMAL, NORMAL, FATIGUED }

/** Ordered from lowest to highest; UNKNOWN = not measured yet. */
enum class Rank { E, D, C, B, A, S, UNKNOWN }

enum class QuestType { DAILY_MAIN, DAILY_SIDE, PENALTY, MAINTENANCE, CHAIN }

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
) {
    /** Quests that must be finished today or a penalty follows. */
    val required: Boolean get() = type != QuestType.DAILY_SIDE
}

data class Inventory(val hasSunscreen: Boolean, val hasTapeMeasure: Boolean, val hasArmband: Boolean)

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
