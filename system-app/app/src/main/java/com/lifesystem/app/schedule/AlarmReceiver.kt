package com.lifesystem.app.schedule

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.lifesystem.app.SystemApp
import com.lifesystem.app.popup.PopupActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Fires a full-screen System popup, then reschedules all alarms for their next occurrence. */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val kind = intent.getStringExtra(AlarmScheduler.EXTRA_KIND) ?: return
        val req = intent.getIntExtra(AlarmScheduler.EXTRA_REQ, 0)
        showPopup(context, kind, intent.getIntExtra(AlarmScheduler.EXTRA_MEAL_SLOT, -1), req, intent.getIntExtra(AlarmScheduler.EXTRA_GATE, 0))
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                rearmAlarms(context)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val CHANNEL = "system_popup"

        fun ensureChannel(context: Context) {
            val nm = context.getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL) == null) {
                nm.createNotificationChannel(NotificationChannel(CHANNEL, "System", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "หน้าต่าง System เต็มจอ"
                })
            }
        }

        fun showPopup(context: Context, kind: String, mealSlot: Int, req: Int, gate: Int = 0) {
            ensureChannel(context)
            val open = Intent(context, PopupActivity::class.java)
                .putExtra(AlarmScheduler.EXTRA_KIND, kind)
                .putExtra(AlarmScheduler.EXTRA_MEAL_SLOT, mealSlot)
                .putExtra(AlarmScheduler.EXTRA_GATE, gate)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            val pi = PendingIntent.getActivity(context, req, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val title = when (kind) {
                PopupKind.MEAL.name -> "[ MEAL TIME ]"
                PopupKind.SLEEP_REMINDER.name -> "[ SYSTEM ] เตรียมนอน"
                PopupKind.PENALTY.name -> "[ PENALTY QUEST ]"
                PopupKind.GATE.name -> "[ GATE OPEN ] ประตูมิติเปิดแล้ว"
                else -> "[ DAILY QUEST ]"
            }
            val n = NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText("ผู้เล่นได้รับข้อความจาก System")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(pi, true)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build()
            runCatching { context.getSystemService(NotificationManager::class.java).notify(req, n) }
        }
    }
}
