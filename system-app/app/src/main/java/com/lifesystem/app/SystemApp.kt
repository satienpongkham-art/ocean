package com.lifesystem.app

import android.app.Application
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.SystemDb
import com.lifesystem.app.health.DaySync
import com.lifesystem.app.health.HealthConnectSource
import com.lifesystem.app.health.StepCounterSource
import com.lifesystem.app.health.UsageScreenSource
import com.lifesystem.app.schedule.AlarmReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.time.LocalDate

class SystemApp : Application() {
    val repository: Repository by lazy { Repository(SystemDb.get(this)) }

    val screenSource by lazy { UsageScreenSource(this) }
    val healthSource by lazy { HealthConnectSource(this) }

    /** Prepares a day from real data (last night's sleep, steps) before the board is built. */
    val daySync: DaySync by lazy { DaySync(repository, screenSource, healthSource, StepCounterSource(this, repository)) }

    /** True when sleep is judged automatically, so the manual "เข้านอนแล้ว" buttons step aside. */
    suspend fun autoSleep(): Boolean = screenSource.granted() || HealthConnectSource.PERMISSIONS.first() in healthSource.grantedPermissions()

    /** For writes that must finish even if the screen that started them goes away. */
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        AlarmReceiver.ensureChannel(this)
    }

    companion object {
        fun today(): Long = LocalDate.now().toEpochDay()
    }
}
