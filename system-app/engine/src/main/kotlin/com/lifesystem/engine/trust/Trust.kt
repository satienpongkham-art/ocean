package com.lifesystem.engine.trust

/** Round 2 rule R2.7: how consistent self-reports are with sensor data. */
object Trust {
    const val START = 70

    fun update(score: Int, contradictions: Int): Int = (if (contradictions == 0) score + 2 else score - 10 * contradictions).coerceIn(0, 100)

    fun selfMultiplier(score: Int): Double = when {
        score >= 80 -> 1.2
        score <= 40 -> 0.8
        else -> 1.0
    }

    fun contradictions(kitchenClose: Boolean, mealAfter21: Boolean, manualSleep: Boolean, screenOnAfterBed: Boolean): Int =
        (if (kitchenClose && mealAfter21) 1 else 0) + (if (manualSleep && screenOnAfterBed) 1 else 0)
}
