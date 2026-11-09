package com.lifesystem.app.popup

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.lifesystem.app.MainActivity
import com.lifesystem.app.SystemApp
import com.lifesystem.app.data.AvatarLook
import com.lifesystem.app.data.MealLogEntity
import com.lifesystem.app.data.avatarLook
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.data.Targets
import com.lifesystem.app.schedule.AlarmScheduler
import com.lifesystem.app.schedule.PopupKind
import com.lifesystem.app.ui.theme.SystemTheme
import com.lifesystem.engine.model.MealSlot
import com.lifesystem.engine.nutrition.MealPlanner
import com.lifesystem.engine.nutrition.MenuCatalog
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalTime

/** Shows a System window over the lock screen (spec §15.3). */
class PopupActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        val kind = intent.getStringExtra(AlarmScheduler.EXTRA_KIND) ?: PopupKind.DAILY_QUEST.name
        val slotIndex = intent.getIntExtra(AlarmScheduler.EXTRA_MEAL_SLOT, 1)
        val gateIndex = intent.getIntExtra(AlarmScheduler.EXTRA_GATE, 0)
        val repo = (application as SystemApp).repository
        val today = SystemApp.today()

        setContent {
            SystemTheme {
                val scope = rememberCoroutineScope()
                when (kind) {
                    PopupKind.MEAL.name -> {
                        val slot = MealSlot.values().getOrElse(slotIndex) { MealSlot.LUNCH }
                        val options = remember { MenuCatalog.items.filter { it.slot == slot } }
                        var index by remember { mutableIntStateOf(0) }
                        var left by remember { mutableStateOf<Pair<Int, Int>?>(null) }
                        var logged by remember { mutableStateOf(false) }
                        LaunchedEffect(Unit) {
                            val profile = repo.profile() ?: return@LaunchedEffect
                            val targets = Targets.of(profile, repo.latest(MeasureType.WEIGHT)?.value)
                            val plan = MealPlanner.best(MenuCatalog.items, targets.kcal, targets.budget)
                            index = options.indexOf(plan?.picks?.get(slot)).coerceAtLeast(0)
                            val eaten = repo.meals(today).first()
                            logged = eaten.any { it.slot == slot.name }
                            left = Pair(targets.kcal - eaten.sumOf { it.kcal }, targets.budget - eaten.sumOf { it.price })
                        }
                        val item = options[index]
                        MealPopup(
                            slotLabel = slot.name,
                            item = item,
                            leftKcal = left?.let { it.first - item.kcal },
                            leftBudget = left?.let { it.second - item.price },
                            logged = logged,
                            onEat = {
                                if (!logged) scope.launch {
                                    logged = true
                                    repo.logMeal(MealLogEntity(epochDay = today, slot = slot.name, menuId = item.id, kcal = item.kcal, protein = item.protein, price = item.price))
                                    finish()
                                }
                            },
                            onSwap = { index = (index + 1) % options.size },
                            onOther = { openApp("meal"); finish() },
                        )
                    }
                    PopupKind.GATE.name -> {
                        var gate by remember { mutableStateOf<List<QuestEntity>>(emptyList()) }
                        var look by remember { mutableStateOf(AvatarLook()) }
                        LaunchedEffect(Unit) {
                            (application as SystemApp).daySync.sync(today)
                            gate = repo.board(today).first().filter { it.questId.startsWith("gate${gateIndex}_") }
                            look = repo.avatarLook()
                        }
                        GatePopup(gate, onAccept = { openApp("gate"); finish() }, look = look)
                    }
                    PopupKind.SLEEP_REMINDER.name -> {
                        var auto by remember { mutableStateOf(true) }
                        LaunchedEffect(Unit) { auto = (application as SystemApp).autoSleep() }
                        SleepReminderPopup(
                        onOk = { finish() },
                        onInBed = if (auto) null else fun() {
                            scope.launch {
                                val sleepMin = repo.profile()?.sleepMin
                                val now = nowMinute()
                                if (sleepMin != null && PopupRules.bedOnTime(now, sleepMin)) {
                                    repo.complete(PopupRules.bedDay(today, now, sleepMin), "sleep")
                                }
                                finish()
                            }
                        },
                        )
                    }
                    else -> {
                        var quests by remember { mutableStateOf<List<QuestEntity>>(emptyList()) }
                        var look by remember { mutableStateOf(AvatarLook()) }
                        LaunchedEffect(Unit) { (application as SystemApp).daySync.sync(today); quests = repo.board(today).first(); look = repo.avatarLook() }
                        val left = Duration.between(LocalDateTime.now(), LocalDateTime.now().with(LocalTime.MAX))
                        DailyQuestPopup(
                            quests = quests,
                            timeLeft = "%02d:%02d".format(left.toHours(), left.toMinutesPart()),
                            look = look,
                            onAccept = {
                                scope.launch {
                                    (application as SystemApp).daySync.sync(today) // idempotent; the board exists before completing
                                    val wakeMin = repo.profile()?.wakeMin
                                    if (wakeMin != null && PopupRules.wakeOnTime(nowMinute(), wakeMin)) repo.complete(today, "wake")
                                    openApp("quests"); finish()
                                }
                            },
                        )
                    }
                }
            }
        }
    }

    /** singleTop: a later alarm reuses this instance, so rebuild it for the new popup kind and date. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        recreate()
    }

    private fun nowMinute(): Int = LocalTime.now().let { it.hour * 60 + it.minute }

    private fun openApp(route: String) {
        startActivity(Intent(this, MainActivity::class.java).putExtra(MainActivity.EXTRA_ROUTE, route).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
