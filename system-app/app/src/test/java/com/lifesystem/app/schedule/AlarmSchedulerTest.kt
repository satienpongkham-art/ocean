package com.lifesystem.app.schedule

import android.app.AlarmManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.lifesystem.app.data.ProfileEntity
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowAlarmManager
import java.time.LocalDateTime
import java.time.ZoneId

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AlarmSchedulerTest {
    private val bkk = ZoneId.of("Asia/Bangkok")
    private fun ms(y: Int, mo: Int, d: Int, h: Int, mi: Int, s: Int = 0) = LocalDateTime.of(y, mo, d, h, mi, s).atZone(bkk).toInstant().toEpochMilli()

    @Test fun nextTrigger_laterToday() =
        assertEquals(ms(2026, 11, 9, 7, 0), AlarmMath.nextTrigger(ms(2026, 11, 9, 6, 0), 7 * 60, bkk))

    @Test fun nextTrigger_rollsToTomorrowAfterTime() =
        assertEquals(ms(2026, 11, 10, 7, 0), AlarmMath.nextTrigger(ms(2026, 11, 9, 7, 0, 1), 7 * 60, bkk))

    @Test fun scheduleMode_fallsBackWhenExactDenied() {
        ShadowAlarmManager.setCanScheduleExactAlarms(false)
        val s = AlarmScheduler(ApplicationProvider.getApplicationContext())
        assertEquals(ScheduleMode.INEXACT_FALLBACK, s.mode())
        ShadowAlarmManager.setCanScheduleExactAlarms(true)
        assertEquals(ScheduleMode.EXACT, s.mode())
    }

    @Test fun scheduleAll_setsWakeMealsAndSleepReminder() {
        ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val profile = ProfileEntity(name = "p", age = 25, sex = "MALE", heightCm = 180.0, day0EpochDay = 0)
        AlarmScheduler(ctx).scheduleAll(profile)
        val am = ctx.getSystemService(AlarmManager::class.java)
        assertEquals(1 + profile.mealMinutes().size + 1, shadowOf(am).scheduledAlarms.size)
    }
}
