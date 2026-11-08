package com.lifesystem.engine.model

object EngineInfo {
    const val VERSION = "0.1.0"
}

/** Body condition derived from last night's sleep (replaces "HP"). */
enum class Condition { OPTIMAL, NORMAL, FATIGUED }

/** Ordered from lowest to highest; UNKNOWN = not measured yet. */
enum class Rank { E, D, C, B, A, S, UNKNOWN }

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
