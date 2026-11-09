package com.lifesystem.engine.screen

/** Round 2 rule R2.5: entertainment minutes against a daily cap. */
object ScreenTimeBoss {
    const val DEFAULT_CAP_MIN = 120

    data class Result(val win: Boolean, val pressure: Float)

    fun evaluate(usedMin: Int, capMin: Int): Result {
        val cap = capMin.coerceAtLeast(1)
        return Result(usedMin <= cap, (usedMin / cap.toFloat()).coerceIn(0f, 1f))
    }
}
