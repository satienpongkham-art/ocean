package com.lifesystem.app

import android.app.Application
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.SystemDb
import com.lifesystem.app.schedule.AlarmReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.time.LocalDate

class SystemApp : Application() {
    val repository: Repository by lazy { Repository(SystemDb.get(this)) }

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
