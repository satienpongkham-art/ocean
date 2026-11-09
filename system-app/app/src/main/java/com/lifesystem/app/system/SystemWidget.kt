package com.lifesystem.app.system

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.lifesystem.app.MainActivity
import com.lifesystem.app.R
import com.lifesystem.app.Routes
import com.lifesystem.app.SystemApp
import com.lifesystem.engine.model.QuestType
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalTime

/** Small square widget for the home screen or the Flip cover screen: level, core x/y, next event. */
class SystemWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = refresh(context)

    companion object {
        fun refresh(context: Context) {
            val app = context.applicationContext as SystemApp
            app.appScope.launch {
                val mgr = AppWidgetManager.getInstance(context)
                val ids = mgr.getAppWidgetIds(ComponentName(context, SystemWidget::class.java))
                if (ids.isEmpty()) return@launch
                val repo = app.repository
                val board = repo.board(SystemApp.today()).first()
                val core = board.filter { it.toQuest().core && it.type != QuestType.GATE.name && it.type != QuestType.EMERGENCY.name }
                val now = LocalTime.now().let { it.hour * 60 + it.minute }
                val next = board.filter { (it.type == QuestType.GATE.name || it.type == QuestType.EMERGENCY.name) && !it.done && (it.closeMin ?: 0) > now }
                    .minByOrNull { it.openMin ?: 0 }?.let { q ->
                        val o = q.openMin ?: 0
                        if (now >= o) "${if (q.type == QuestType.GATE.name) "GATE" else "EMERGENCY"} เปิดอยู่" else "GATE %02d:%02d".format(o / 60, o % 60)
                    } ?: "ไม่มีประตูวันนี้"
                val views = RemoteViews(context.packageName, R.layout.widget_system).apply {
                    setTextViewText(R.id.w_level, "LV ${repo.wallet().level}")
                    setTextViewText(R.id.w_core, "CORE ${core.count { it.done }}/${core.size}")
                    setTextViewText(R.id.w_next, next)
                    setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(context, 7,
                        Intent(context, MainActivity::class.java).putExtra(MainActivity.EXTRA_ROUTE, Routes.SYSTEM).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
                }
                mgr.updateAppWidget(ids, views)
            }
        }
    }
}
