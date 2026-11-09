package com.lifesystem.app.health

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Process
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.lifesystem.app.data.OwnedItemEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.getSetting
import com.lifesystem.engine.night.ScreenEvent
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.time.Instant
import kotlin.coroutines.resume

/** Screen on/off from UsageStats (needs "usage access"). */
class UsageScreenSource(private val context: Context) : ScreenSource {
    fun granted(): Boolean {
        val ops = context.getSystemService(AppOpsManager::class.java)
        @Suppress("DEPRECATION")
        return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
    }

    override suspend fun events(fromMs: Long, toMs: Long): List<ScreenEvent>? {
        if (!granted()) return null
        val usm = context.getSystemService(UsageStatsManager::class.java)
        val ev = usm.queryEvents(fromMs, toMs)
        val out = mutableListOf<ScreenEvent>()
        val e = UsageEvents.Event()
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e)
            when (e.eventType) {
                UsageEvents.Event.SCREEN_INTERACTIVE -> out += ScreenEvent(e.timeStamp, true)
                UsageEvents.Event.SCREEN_NON_INTERACTIVE -> out += ScreenEvent(e.timeStamp, false)
            }
        }
        return out
    }

    /** Foreground minutes in game/social/video apps, plus any app the player put on the lock list. */
    override suspend fun entertainmentMinutes(fromMs: Long, toMs: Long): Int? {
        if (!granted()) return null
        val usm = context.getSystemService(UsageStatsManager::class.java)
        val pm = context.packageManager
        val repo = (context.applicationContext as com.lifesystem.app.SystemApp).repository
        val extra = repo.getSetting(com.lifesystem.app.data.Keys.LOCK_APPS, "").split(',').filter { it.isNotBlank() }.toSet()
        val fun_ = setOf(android.content.pm.ApplicationInfo.CATEGORY_GAME, android.content.pm.ApplicationInfo.CATEGORY_SOCIAL, android.content.pm.ApplicationInfo.CATEGORY_VIDEO)
        val ms = usm.queryAndAggregateUsageStats(fromMs, toMs).values.filter { st ->
            st.packageName in extra || runCatching { pm.getApplicationInfo(st.packageName, 0).category in fun_ }.getOrDefault(false)
        }.sumOf { it.totalTimeInForeground }
        return (ms / 60_000).toInt()
    }
}

/** Sleep sessions and steps from Health Connect (Samsung Health writes both when sync is on). */
class HealthConnectSource(private val context: Context) : HealthSource {
    companion object {
        val PERMISSIONS = setOf(
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(StepsRecord::class),
        )
    }

    fun available(): Boolean = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    private fun client(): HealthConnectClient? = if (available()) HealthConnectClient.getOrCreate(context) else null

    suspend fun grantedPermissions(): Set<String> = runCatching { client()?.permissionController?.getGrantedPermissions() }.getOrNull().orEmpty()

    override suspend fun sleep(fromMs: Long, toMs: Long): Pair<Long, Long>? = runCatching {
        val c = client() ?: return null
        if (HealthPermission.getReadPermission(SleepSessionRecord::class) !in c.permissionController.getGrantedPermissions()) return null
        val res = c.readRecords(ReadRecordsRequest(SleepSessionRecord::class, TimeRangeFilter.between(Instant.ofEpochMilli(fromMs), Instant.ofEpochMilli(toMs))))
        res.records.maxByOrNull { it.endTime.toEpochMilli() - it.startTime.toEpochMilli() }
            ?.let { it.startTime.toEpochMilli() to it.endTime.toEpochMilli() }
    }.getOrNull()

    override suspend fun steps(fromMs: Long, toMs: Long): Int? = runCatching {
        val c = client() ?: return null
        if (HealthPermission.getReadPermission(StepsRecord::class) !in c.permissionController.getGrantedPermissions()) return null
        val agg = c.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(Instant.ofEpochMilli(fromMs), Instant.ofEpochMilli(toMs))))
        agg[StepsRecord.COUNT_TOTAL]?.toInt()
    }.getOrNull()
}

/**
 * Phone step counter (cumulative since boot). Stores the first reading of each day as the baseline;
 * a reboot (counter below baseline) restarts the baseline at 0.
 */
class StepCounterSource(private val context: Context, private val repo: Repository) : StepSource {
    override suspend fun stepsToday(epochDay: Long): Int? {
        val sm = context.getSystemService(SensorManager::class.java)
        val sensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return null
        val total = withTimeoutOrNull(2_000) {
            suspendCancellableCoroutine { cont ->
                val l = object : SensorEventListener {
                    override fun onSensorChanged(e: SensorEvent) { sm.unregisterListener(this); if (cont.isActive) cont.resume(e.values[0].toInt()) }
                    override fun onAccuracyChanged(s: Sensor?, a: Int) = Unit
                }
                if (!sm.registerListener(l, sensor, SensorManager.SENSOR_DELAY_NORMAL)) cont.resume(-1)
                cont.invokeOnCancellation { sm.unregisterListener(l) }
            }
        }?.takeIf { it >= 0 } ?: return null
        val key = "steps_base_$epochDay"
        val base = repo.dao.ownedItem(key)?.qty
        return when {
            base == null -> { repo.dao.upsertOwned(OwnedItemEntity(key, "MARK", total)); 0 }
            total < base -> { repo.dao.upsertOwned(OwnedItemEntity(key, "MARK", 0)); total }
            else -> total - base
        }
    }
}

