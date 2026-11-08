package com.lifesystem.app.schedule

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.lifesystem.app.SystemApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Re-arms every alarm after reboot, clock change or time-zone change. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                (context.applicationContext as SystemApp).repository.profile()?.let { AlarmScheduler(context).scheduleAll(it) }
            } finally {
                pending.finish()
            }
        }
    }
}
