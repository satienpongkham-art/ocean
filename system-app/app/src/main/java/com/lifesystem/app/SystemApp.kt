package com.lifesystem.app

import android.app.Application
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.SystemDb
import com.lifesystem.app.schedule.AlarmReceiver
import java.time.LocalDate

class SystemApp : Application() {
    val repository: Repository by lazy { Repository(SystemDb.get(this)) }

    override fun onCreate() {
        super.onCreate()
        AlarmReceiver.ensureChannel(this)
    }

    companion object {
        fun today(): Long = LocalDate.now().toEpochDay()
    }
}
