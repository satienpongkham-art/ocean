package com.lifesystem.app.ui.quest

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.AvatarLook
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.ui.components.AvatarView
import com.lifesystem.app.ui.components.Chip
import com.lifesystem.app.ui.components.GoalRow
import com.lifesystem.app.ui.components.HudBar
import com.lifesystem.app.ui.components.QuestInfoWindow
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.components.rememberCountdownToMidnight
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.maintenance.Maintenance
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Stat
import java.time.LocalTime

fun QuestEntity.displayTitle(): String =
    if (type == QuestType.MAINTENANCE.name) "ซ่อมบำรุง · " + Maintenance.title(questId.removePrefix("mt_")) else title

private fun hhmm(min: Int) = "%02d:%02d".format(min / 60 % 24, min % 60)

fun QuestEntity.toGoal(minuteOfDay: Int): GoalRow {
    val o = openMin; val c = closeMin
    val note = when {
        o != null && c != null && minuteOfDay < o -> "เปิด ${hhmm(o)}"
        o != null && c != null && !done && minuteOfDay in o until c -> null
        else -> null
    }
    val label = displayTitle().removePrefix("GATE ").removePrefix("BOSS · ").removePrefix("PENALTY · ").removePrefix("EMERGENCY · ")
    return GoalRow(questId, if (toQuest().core && type == QuestType.DAILY_MAIN.name) "★ $label" else label, progress, target, done, unit, note)
}

fun accentFor(prop: String): Color = when (prop) {
    "PENALTY" -> SysColors.Crimson
    "GOLD" -> SysColors.Gold
    else -> runCatching { SysColors.stat(Stat.valueOf(prop)) }.getOrDefault(SysColors.Cyan)
}

/** Avatar in the pose of a quest category: the category's prop and aura colour, plus equipped gear. */
@Composable
fun CategoryAvatar(look: AvatarLook, prop: String, pixel: Float = 3.5f) {
    AvatarView(look.stage, pixel = pixel.dp, outfit = look.outfit, weapon = look.weapon.takeIf { prop == "STR" || prop == "AGI" }, aura = accentFor(prop), prop = prop)
}

/**
 * Daily quest board as QUEST INFO windows per category. Tapping a goal ticks it (self-verified) or opens
 * the place where it is done (sensor training, body log, journal...).
 */
@Composable
fun QuestLogScreen(vm: QuestViewModel, onOpen: (QuestEntity) -> Unit) {
    val board by vm.board.collectAsStateWithLifecycle()
    val dayNumber by vm.dayNumber.collectAsStateWithLifecycle()
    val notice by vm.notice.collectAsStateWithLifecycle()
    val look by vm.look.collectAsStateWithLifecycle()
    val timer = rememberCountdownToMidnight()
    val minute = LocalTime.now().let { it.hour * 60 + it.minute }
    val required = board.filter { it.toQuest().required && it.type != QuestType.GATE.name && it.type != QuestType.EMERGENCY.name }
    val core = board.filter { it.toQuest().core && it.type != QuestType.GATE.name && it.type != QuestType.EMERGENCY.name }
    val done = required.count { it.done }
    val allDone = required.isNotEmpty() && done == required.size
    val windows = QuestWindows.group(board, minute)
    val byId = board.associateBy { it.questId }

    LazyColumn(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            ScreenHeader("QUEST LOG", "DAY %02d".format(dayNumber))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("เควสต์บังคับวันนี้", style = Txt.body.copy(fontSize = 13.sp))
                        Text("$done / ${required.size}", style = Txt.num.copy(color = SysColors.Cyan, fontSize = 13.sp))
                    }
                    HudBar(if (required.isEmpty()) 0f else done / required.size.toFloat(), SysColors.Cyan, Modifier.padding(top = 4.dp))
                }
                Box(Modifier.padding(start = 12.dp)) {
                    Chip(if (allDone) "COMPLETE" else "IN PROGRESS", if (allDone) SysColors.Mint else SysColors.CrimsonText)
                }
            }
            Text("CORE ${core.count { it.done }}/${core.size} · พลาด CORE = บทลงโทษ · ที่เหลือทำครบได้โบนัส", style = Txt.sub.copy(color = SysColors.CrimsonText), modifier = Modifier.padding(top = 4.dp))
            if (notice.isNotEmpty()) Text(notice, style = Txt.sub.copy(color = SysColors.Emergency), modifier = Modifier.padding(top = 6.dp))
        }
        items(windows, key = { it.key }) { w ->
            QuestInfoWindow(
                subtitle = w.subtitle,
                accent = accentFor(w.prop),
                goals = w.quests.map { it.toGoal(minute) },
                caution = w.caution,
                timer = if (w.caution != null) timer else null,
                avatar = { CategoryAvatar(look, w.prop) },
                onGoal = { g ->
                    val q = byId[g.id] ?: return@QuestInfoWindow
                    if (QuestActions.tickable(q) && !q.done) vm.tick(q.questId) else if (!q.done) onOpen(q)
                },
            )
        }
        item { Text("แตะเป้าหมายเพื่อทำ · เควสต์ยืนยันเองแตะแล้วติ๊กทันที", style = Txt.sub, modifier = Modifier.padding(bottom = 16.dp)) }
    }
}

