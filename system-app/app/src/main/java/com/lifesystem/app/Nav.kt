package com.lifesystem.app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import android.content.Intent
import android.provider.Settings
import com.lifesystem.app.data.ProfileEntity
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.components.SystemBackground
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.onboarding.OnboardingScreen
import com.lifesystem.app.ui.quest.QuestLogScreen
import com.lifesystem.app.ui.quest.QuestViewModel
import com.lifesystem.app.ui.status.StatusScreen
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.app.ui.system.SystemCallButton
import com.lifesystem.app.ui.system.SystemCallDialog
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Verify
import kotlinx.coroutines.flow.map

object Routes {
    const val STATUS = "status"
    const val QUESTS = "quests"
    const val TRAINING = "training"
    const val MEAL = "meal"
    const val BODY = "body"
    const val JOURNAL = "journal"
    const val MAINTENANCE = "maintenance"
    const val GATE = "gate"
    const val SHOP = "shop"
    const val MENU = "menu"
    const val TITLES = "titles"
    const val SYSTEM = "system"
}

private val tabs = listOf(Routes.STATUS to "STATUS", Routes.QUESTS to "QUEST", Routes.GATE to "GATE", Routes.SHOP to "SHOP", Routes.MENU to "MENU")

/** Where tapping a quest that cannot be ticked by hand should go. */
fun routeFor(q: QuestEntity): String = when {
    q.verify == Verify.SENSOR.name -> "${Routes.TRAINING}/${q.questId}"
    q.type == QuestType.BOSS.name -> Routes.GATE
    q.questId == "journal" -> Routes.JOURNAL
    q.questId.startsWith("mt_") -> Routes.MAINTENANCE
    q.questId == "steps" || q.questId == "screen_off" || q.questId == "sleep" -> Routes.MENU
    else -> Routes.BODY
}

/** Wraps the profile so "still loading" (null) differs from "no profile yet". */
private class ProfileLoad(val profile: ProfileEntity?)

@Composable
fun SystemNav(repo: Repository, today: Long, route: String?, problems: List<String>, onRouteHandled: () -> Unit) {
    val load by remember { repo.profileFlow().map { ProfileLoad(it) } }
        .collectAsStateWithLifecycle(initialValue = null, minActiveState = androidx.lifecycle.Lifecycle.State.CREATED)
    val profile = load?.profile
    val nav = rememberNavController()
    val app = LocalContext.current.applicationContext as SystemApp
    // Keyed by day: a new day gets a fresh view model (and board) instead of the one created yesterday.
    val questVm: QuestViewModel = viewModel(key = "quests-$today", factory = remember(today) { viewModelFactory { initializer { QuestViewModel(repo, today, { app.daySync.sync(it) }, { !app.autoSleep() }) } } })
    var systemOpen by remember { mutableStateOf(false) }
    LaunchedEffect(route, load != null) {
        if (route != null && profile != null) {
            if (route == Routes.SYSTEM) systemOpen = true
            else if (route != Routes.QUESTS) nav.navigate(route) { launchSingleTop = true }
            else nav.navigate(Routes.QUESTS) { popUpTo(Routes.QUESTS) { inclusive = true } }
            onRouteHandled()
        }
    }
    SystemBackground {
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
            if (profile != null && problems.isNotEmpty()) ProblemBanner(problems)
            Box(Modifier.weight(1f).padding(top = 12.dp)) {
                NavHost(nav, startDestination = Routes.QUESTS) {
                    composable(Routes.STATUS) { StatusScreen(repo, today) }
                    composable(Routes.QUESTS) {
                        when {
                            load == null -> Box(Modifier.fillMaxSize())
                            profile == null -> OnboardingScreen(repo, today) { }
                            else -> QuestLogScreen(questVm) { q -> nav.navigate(routeFor(q)) }
                        }
                    }
                    extraRoutes(nav, repo, today)
                }
            }
            if (profile != null) BottomBar(nav)
        }
        if (profile != null) {
            Box(Modifier.fillMaxSize().statusBarsPadding().padding(top = 4.dp, end = 10.dp), contentAlignment = Alignment.TopEnd) {
                SystemCallButton({ systemOpen = true })
            }
        }
        if (systemOpen) SystemCallDialog(repo, today, onDismiss = { systemOpen = false }, onRoute = { r ->
            nav.navigate(r) { popUpTo(Routes.QUESTS) { saveState = true }; launchSingleTop = true; restoreState = true }
        })
    }
}

@Composable
private fun ProblemBanner(problems: List<String>) {
    val ctx = LocalContext.current
    Column(
        Modifier.fillMaxWidth().background(SysColors.Emergency.copy(alpha = 0.12f)).border(1.dp, SysColors.Emergency.copy(alpha = 0.6f))
            .clickable(role = Role.Button) {
                ctx.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName))
            }
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Text("[ WARNING ] แตะเพื่อแก้", style = Txt.sys.copy(color = SysColors.Emergency, fontSize = 11.sp))
        problems.forEach { Text("· $it", style = Txt.sub.copy(color = SysColors.Text)) }
    }
}

@Composable
private fun BottomBar(nav: NavHostController) {
    val current by nav.currentBackStackEntryAsState()
    val route = current?.destination?.route
    Row(Modifier.fillMaxWidth().background(SysColors.Void).border(1.dp, SysColors.Cyan.copy(alpha = 0.2f)), horizontalArrangement = Arrangement.SpaceEvenly) {
        tabs.forEach { (r, label) ->
            val on = route == r
            Box(
                Modifier.weight(1f).heightIn(min = 52.dp).clickable(role = Role.Tab) {
                    nav.navigate(r) { popUpTo(Routes.QUESTS) { saveState = true }; launchSingleTop = true; restoreState = true }
                },
                contentAlignment = Alignment.Center,
            ) {
                Text(label, style = Txt.sys.copy(color = if (on) SysColors.CyanHi else SysColors.Muted, fontSize = 11.sp))
            }
        }
    }
}
