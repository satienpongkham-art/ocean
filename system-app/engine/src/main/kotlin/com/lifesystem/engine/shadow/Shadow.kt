package com.lifesystem.engine.shadow

/** Round 2 rule R2.10: race your own numbers from the same weekday last week. */
object Shadow {
    const val BONUS_G = 5
    val RACED = listOf("pushup", "squat", "steps")

    /** Progress made by [minuteOfDay] from (minute, amount) log entries. */
    fun progressBy(logs: List<Pair<Int, Int>>, minuteOfDay: Int): Int = logs.filter { it.first <= minuteOfDay }.sumOf { it.second }

    fun beats(today: Int, lastWeek: Int): Boolean = lastWeek > 0 && today > lastWeek
}
