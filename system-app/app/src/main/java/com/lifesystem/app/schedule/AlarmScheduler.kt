package com.lifesystem.app.schedule

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.lifesystem.app.data.ProfileEntity
import com.lifesystem.engine.gate.GateGenerator
import com.lifesystem.app.data.getBool
import com.lifesystem.app.data.getSetting
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId

enum class PopupKind { DAILY_QUEST, PENALTY, MEAL, SLEEP_REMINDER, GATE }

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

    fun scheduleAll(
        profile: ProfileEntity,
        nowMs: Long = System.currentTimeMillis(),
        zone: ZoneId = ZoneId.systemDefault(),
        meals: Set<Int> = setOf(0, 1, 2, 3),
        sleepReminder: Boolean = true,
    ) {
        schedule(REQ_WAKE, AlarmMath.nextTrigger(nowMs, profile.wakeMin, zone), PopupKind.DAILY_QUEST, null)
        profile.mealMinutes().forEachIndexed { i, minute ->
            if (i in meals) schedule(REQ_MEAL + i, AlarmMath.nextTrigger(nowMs, minute, zone), PopupKind.MEAL, i) else cancel(REQ_MEAL + i)
        }
        val reminder = (profile.sleepMin - 30 + 24 * 60) % (24 * 60)
        if (sleepReminder) schedule(REQ_SLEEP, AlarmMath.nextTrigger(nowMs, reminder, zone), PopupKind.SLEEP_REMINDER, null) else cancel(REQ_SLEEP)
    }

    private fun cancel(requestCode: Int) {
        val pi = PendingIntent.getBroadcast(context, requestCode, Intent(context, AlarmReceiver::class.java), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        if (pi != null) { am.cancel(pi); pi.cancel() }
    }

    /** A missing permission with the settings screen that fixes it. */
    data class Problem(val text: String, val fix: Intent)

    /** Thai warnings for anything that would stop popups from appearing; empty = all good. */
    fun problems(): List<Problem> {
        val nm = context.getSystemService(NotificationManager::class.java)
        val pkg = android.net.Uri.parse("package:" + context.packageName)
        return buildList {
            if (!nm.areNotificationsEnabled()) add(Problem("การแจ้งเตือนถูกปิด · ป๊อปอัปจะไม่เด้ง",
                Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)))
            if (Build.VERSION.SDK_INT >= 34 && !nm.canUseFullScreenIntent()) add(Problem("ยังไม่อนุญาตแจ้งเตือนเต็มหน้าจอ · แตะเพื่อเปิด",
                Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg)))
            if (mode() == ScheduleMode.INEXACT_FALLBACK && Build.VERSION.SDK_INT >= 31) add(Problem("ยังไม่อนุญาตปลุกตรงเวลา · แตะเพื่อเปิด",
                Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg)))
        }
    }

    /** One popup when each of today's gates opens (only gates still in the future). */
    fun scheduleGates(epochDay: Long, level: Int, profile: ProfileEntity, nowMs: Long = System.currentTimeMillis(), zone: ZoneId = ZoneId.systemDefault()) {
        val dayStart = java.time.LocalDate.ofEpochDay(epochDay).atStartOfDay(zone).toInstant().toEpochMilli()
        GateGenerator.generate(epochDay, level, profile.wakeMin, profile.sleepMin).forEach { g ->
            val at = dayStart + g.openMin * 60_000L
            if (at > nowMs) schedule(REQ_GATE + g.index, at, PopupKind.GATE, null, g.index)
        }
    }

    /** Onboarding check: a DAILY_QUEST popup in [delayMs] (spec §3 step 9). */
    fun scheduleTest(delayMs: Long = 10_000L) =
        schedule(REQ_TEST, System.currentTimeMillis() + delayMs, PopupKind.DAILY_QUEST, null)

    private fun schedule(requestCode: Int, atMs: Long, kind: PopupKind, mealSlot: Int?, gate: Int? = null) {
        val intent = Intent(context, AlarmReceiver::class.java)
            .putExtra(EXTRA_KIND, kind.name)
            .putExtra(EXTRA_REQ, requestCode)
        if (mealSlot != null) intent.putExtra(EXTRA_MEAL_SLOT, mealSlot)
        if (gate != null) intent.putExtra(EXTRA_GATE, gate)
        val pi = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        when (mode()) {
            ScheduleMode.EXACT -> am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi)
            // Unlike setWindow, this still fires in Doze (may be a few minutes late).
            ScheduleMode.INEXACT_FALLBACK -> am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi)
        }
    }

    companion object {
        const val EXTRA_KIND = "popup_kind"
        const val EXTRA_MEAL_SLOT = "meal_slot"
        const val EXTRA_REQ = "req"
        const val EXTRA_GATE = "gate"
        private const val REQ_GATE = 400
        private const val REQ_WAKE = 100
        private const val REQ_MEAL = 200
        private const val REQ_SLEEP = 300
        private const val REQ_TEST = 900
    }
}

/** Re-arms every alarm (daily popups + today's gates). Safe to call often. */
suspend fun rearmAlarms(context: Context) {
    val repo = (context.applicationContext as com.lifesystem.app.SystemApp).repository
    val profile = repo.profile() ?: return
    val s = AlarmScheduler(context)
    val meals = repo.getSetting(com.lifesystem.app.data.Keys.POPUP_MEALS, "0,1,2,3").split(',').mapNotNull { it.trim().toIntOrNull() }.toSet()
    s.scheduleAll(profile, meals = meals, sleepReminder = repo.getBool(com.lifesystem.app.data.Keys.POPUP_SLEEP, true))
    s.scheduleGates(com.lifesystem.app.SystemApp.today(), repo.wallet().level, profile)
}
