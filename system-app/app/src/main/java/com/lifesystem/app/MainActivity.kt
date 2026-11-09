package com.lifesystem.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.core.content.ContextCompat
import com.lifesystem.app.schedule.AlarmScheduler
import com.lifesystem.app.schedule.rearmAlarms
import com.lifesystem.app.ui.theme.SystemTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    companion object {
        const val EXTRA_ROUTE = "route"
    }

    /** The current day; refreshed on resume and at midnight so a long-lived activity never writes to yesterday. */
    private val today = mutableLongStateOf(SystemApp.today())
    private val route = mutableStateOf<String?>(null)
    private val problems = mutableStateOf<List<AlarmScheduler.Problem>>(emptyList())

    private val dateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = refreshDay()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repo = (application as SystemApp).repository
        route.value = intent.getStringExtra(EXTRA_ROUTE)
        setContent {
            SystemTheme {
                SystemNav(repo, today.longValue, route.value, problems.value, onRouteHandled = { route.value = null })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        route.value = intent.getStringExtra(EXTRA_ROUTE)
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_DATE_CHANGED)
            addAction(Intent.ACTION_TIME_CHANGED)
            addAction(Intent.ACTION_TIMEZONE_CHANGED)
        }
        ContextCompat.registerReceiver(this, dateReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    override fun onStop() {
        unregisterReceiver(dateReceiver)
        super.onStop()
    }

    override fun onResume() {
        super.onResume()
        refreshDay()
        val app = application as SystemApp
        val scheduler = AlarmScheduler(this)
        problems.value = scheduler.problems()
        // Re-arm alarms on every visit (covers force-stop and permission changes) and make sure today's board exists.
        app.appScope.launch {
            if (app.repository.profile() == null) return@launch
            app.daySync.sync(SystemApp.today())
            rearmAlarms(this@MainActivity)
            com.lifesystem.app.system.SystemWidget.refresh(app)
            com.lifesystem.app.lock.GuardService.sync(app)
        }
    }

    private fun refreshDay() {
        val now = SystemApp.today()
        if (today.longValue != now) today.longValue = now
    }
}
