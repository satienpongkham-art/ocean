package com.lifesystem.app.schedule

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.lifesystem.app.data.ProfileEntity
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId

enum class PopupKind { DAILY_QUEST, PENALTY, MEAL, SLEEP_REMINDER }

enum class ScheduleMode { EXACT, INEXACT_FALLBACK }

object AlarmMath {
    /** Next wall-clock occurrence of [minuteOfDay] strictly after [nowMs] in [zone]. */
    fun nextTrigger(nowMs: Long, minuteOfDay: Int, zone: ZoneId): Long {
        val now = Instant.ofEpochMilli(nowMs).atZone(zone)
        var at = now.with(LocalTime.of(minuteOfDay / 60 % 24, minuteOfDay % 60)).withSecond(0).withNano(0)
        if (!at.isAfter(now)) at = at.plusDays(1)
        return at.toInstant().toEpochMilli()
    }
}

/** Schedules every System popup for the next occurrence (spec §5.4, §17.5). */
class AlarmScheduler(private val context: Context) {
    private val am = context.getSystemService(AlarmManager::class.java)

    fun mode(): ScheduleMode =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) ScheduleMode.INEXACT_FALLBACK
        else ScheduleMode.EXACT

    fun scheduleAll(profile: ProfileEntity, nowMs: Long = System.currentTimeMillis(), zone: ZoneId = ZoneId.systemDefault()) {
        schedule(REQ_WAKE, AlarmMath.nextTrigger(nowMs, profile.wakeMin, zone), PopupKind.DAILY_QUEST, null)
        profile.mealMinutes().forEachIndexed { i, minute ->
            schedule(REQ_MEAL + i, AlarmMath.nextTrigger(nowMs, minute, zone), PopupKind.MEAL, i)
        }
        val reminder = (profile.sleepMin - 30 + 24 * 60) % (24 * 60)
        schedule(REQ_SLEEP, AlarmMath.nextTrigger(nowMs, reminder, zone), PopupKind.SLEEP_REMINDER, null)
    }

    /** Onboarding check: a DAILY_QUEST popup in [delayMs] (spec §3 step 9). */
    fun scheduleTest(delayMs: Long = 10_000L) =
        schedule(REQ_TEST, System.currentTimeMillis() + delayMs, PopupKind.DAILY_QUEST, null)

    private fun schedule(requestCode: Int, atMs: Long, kind: PopupKind, mealSlot: Int?) {
        val intent = Intent(context, AlarmReceiver::class.java)
            .putExtra(EXTRA_KIND, kind.name)
            .putExtra(EXTRA_REQ, requestCode)
        if (mealSlot != null) intent.putExtra(EXTRA_MEAL_SLOT, mealSlot)
        val pi = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        when (mode()) {
            ScheduleMode.EXACT -> am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi)
            ScheduleMode.INEXACT_FALLBACK -> am.setWindow(AlarmManager.RTC_WAKEUP, atMs, WINDOW_MS, pi)
        }
    }

    companion object {
        const val EXTRA_KIND = "popup_kind"
        const val EXTRA_MEAL_SLOT = "meal_slot"
        const val EXTRA_REQ = "req"
        private const val REQ_WAKE = 100
        private const val REQ_MEAL = 200
        private const val REQ_SLEEP = 300
        private const val REQ_TEST = 900
        private const val WINDOW_MS = 10 * 60 * 1000L
    }
}
