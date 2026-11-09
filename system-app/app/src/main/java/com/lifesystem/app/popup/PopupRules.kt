package com.lifesystem.app.popup

/**
 * Round-1 completion rules for AUTO quests that have no sensor yet.
 * "wake": accepting the morning popup within 60 min of the wake time.
 * "sleep": tapping "เข้านอนแล้ว" from 60 min before to 30 min after bedtime
 * (honour-based until Health Connect sleep data arrives in Round 2).
 */
object PopupRules {
    const val WAKE_GRACE_MIN = 60
    const val WAKE_EARLY_MIN = 180
    const val BED_EARLY_MIN = 60
    const val BED_LATE_MIN = 30

    fun wakeOnTime(nowMin: Int, wakeMin: Int): Boolean = nowMin in (wakeMin - WAKE_EARLY_MIN)..(wakeMin + WAKE_GRACE_MIN)

    /** Signed minutes from bedtime, wrapped into −720..719 so midnight is handled. */
    private fun fromBed(nowMin: Int, sleepMin: Int): Int = Math.floorMod(nowMin - sleepMin + 720, 1440) - 720

    fun bedOnTime(nowMin: Int, sleepMin: Int): Boolean = fromBed(nowMin, sleepMin) in -BED_EARLY_MIN..BED_LATE_MIN

    /** The quest day a bedtime tap belongs to: a tap after midnight (before noon) still counts for last night. */
    @Suppress("UNUSED_PARAMETER")
    fun bedDay(today: Long, nowMin: Int, sleepMin: Int): Long = if (nowMin < NOON) today - 1 else today

    private const val NOON = 12 * 60
}
