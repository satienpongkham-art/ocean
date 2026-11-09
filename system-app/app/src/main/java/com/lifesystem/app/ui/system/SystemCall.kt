package com.lifesystem.app.ui.system

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.lifesystem.app.data.AvatarLook
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.avatarLook
import com.lifesystem.app.data.qty
import com.lifesystem.app.ui.components.AvatarArt
import com.lifesystem.app.ui.components.AvatarView
import com.lifesystem.app.ui.components.LabeledBar
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.SystemFrame
import com.lifesystem.app.ui.components.SystemHeader
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.achievements.Achievements
import com.lifesystem.engine.boss.Boss
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.progression.Progression
import kotlinx.coroutines.flow.first
import java.time.LocalTime

data class SystemCallUi(
    val name: String = "ผู้เล่น",
    val level: Int = 1,
    val exp: Int = 0,
    val gold: Int = 0,
    val title: String? = null,
    val look: AvatarLook = AvatarLook(),
    val messages: List<SysMessage> = emptyList(),
)

suspend fun loadSystemCall(repo: Repository, today: Long): SystemCallUi {
    val p = repo.profile() ?: return SystemCallUi()
    val w = repo.wallet()
    val board = repo.board(today).first()
    val now = LocalTime.now().let { it.hour * 60 + it.minute }
    val required = board.filter { it.toQuest().required && it.type != QuestType.GATE.name }
    val gates = board.filter { it.type == QuestType.GATE.name }.groupBy { it.questId.substringBefore('_') }
    val open = gates.entries.firstOrNull { (_, qs) -> qs.any { !it.done } && now in (qs.first().openMin ?: 0) until (qs.first().closeMin ?: 0) }
    val sleep = repo.latest(com.lifesystem.app.data.MeasureType.SLEEP_H)?.value
    val steps = board.firstOrNull { it.questId == "steps" }
    val state = SystemState(
        nowMin = now,
        requiredLeft = required.count { !it.done },
        requiredTotal = required.size,
        penaltyActive = board.any { it.type == QuestType.PENALTY.name && !it.done },
        openGate = open?.let { (k, qs) -> "GATE ${k.removePrefix("gate")}" to ((qs.first().closeMin ?: now) - now) },
        nextGateOpenMin = gates.values.mapNotNull { it.first().openMin }.filter { it > now }.minOrNull(),
        bossDay = Boss.isBossDay(today),
        bossFought = repo.dao.boss(today) != null,
        expAtCap = w.exp >= Progression.expCap(w.level),
        condition = Progression.conditionFromSleep(sleep),
        sleepH = sleep,
        expScrolls = repo.qty("EXP_SCROLL"),
        nextMealMin = p.mealMinutes().filter { it >= now }.minOrNull(),
        steps = steps?.let { it.progress to it.target },
    )
    return SystemCallUi(p.name, w.level, w.exp, w.gold, p.titleId?.let { Achievements.byId(it)?.name }, repo.avatarLook(), SystemMessages.build(state))
}

/** Floating diamond that calls the System window from any screen. */
@Composable
fun SystemCallButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier.size(52.dp).semantics { contentDescription = "เรียก SYSTEM" }.clickable(role = Role.Button, onClick = onClick)
            .drawBehind {
                val c = SysColors.Cyan
                val r = size.minDimension / 2
                val p = Path().apply { moveTo(center.x, center.y - r); lineTo(center.x + r, center.y); lineTo(center.x, center.y + r); lineTo(center.x - r, center.y); close() }
                drawCircle(c.copy(alpha = 0.18f), r * 1.15f, center)
                drawPath(p, Color(0xF2050B18))
                drawPath(p, c, style = androidx.compose.ui.graphics.drawscope.Stroke(2.dp.toPx()))
                drawLine(c.copy(alpha = 0.6f), Offset(center.x - r * 0.35f, center.y), Offset(center.x + r * 0.35f, center.y), 1.dp.toPx())
            },
        contentAlignment = Alignment.Center,
    ) { Text("SYS", style = Txt.sys.copy(fontSize = 10.sp, letterSpacing = 1.sp, color = SysColors.CyanHi)) }
}

/** The System window: who you are now, what the System says, and where to go. */
@Composable
fun SystemCallDialog(repo: Repository, today: Long, onDismiss: () -> Unit, onRoute: (String) -> Unit) {
    var ui by remember { mutableStateOf(SystemCallUi()) }
    LaunchedEffect(Unit) { ui = loadSystemCall(repo, today) }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color(0xCC000000)).padding(16.dp), contentAlignment = Alignment.Center) {
            Column(Modifier.verticalScroll(rememberScrollState())) { SystemCallContent(ui, onDismiss, onRoute) }
        }
    }
}

@Composable
fun SystemCallContent(ui: SystemCallUi, onDismiss: () -> Unit, onRoute: (String) -> Unit) {
                SystemFrame(accent = SysColors.Cyan) {
                    SystemHeader("SYSTEM")
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        AvatarView(ui.look.stage, pixel = 3.5.dp, outfit = ui.look.outfit, weapon = ui.look.weapon, aura = ui.look.aura?.let { AvatarArt.auras[it] } ?: SysColors.Cyan)
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(ui.name, style = Txt.title)
                            ui.title?.let { Text("「$it」", style = Txt.sub.copy(color = SysColors.Gold)) }
                            Text("LEVEL ${ui.level} · ${ui.gold} G", style = Txt.num.copy(fontSize = 14.sp))
                            val need = Progression.expNeeded(ui.level)
                            LabeledBar("EXP", "${ui.exp}/$need", ui.exp / need.toFloat(), SysColors.Cyan)
                        }
                    }
                    Text("ข้อความจาก System", style = Txt.body.copy(color = SysColors.Cyan, fontSize = 13.sp))
                    if (ui.messages.isEmpty()) Text("ไม่มีข้อความใหม่", style = Txt.sub)
                    ui.messages.forEach { m ->
                        val c = when (m.level) { MsgLevel.ALERT -> SysColors.Crimson; MsgLevel.WARN -> SysColors.Emergency; MsgLevel.INFO -> SysColors.Cyan }
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 44.dp).border(1.dp, c.copy(alpha = 0.45f))
                                .then(if (m.route != null) Modifier.clickable(role = Role.Button) { onRoute(m.route); onDismiss() } else Modifier)
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(if (m.level == MsgLevel.ALERT) "!" else "◆", style = Txt.num.copy(color = c, fontSize = 14.sp), modifier = Modifier.width(18.dp))
                            Text(m.text, style = Txt.body.copy(fontSize = 13.sp), modifier = Modifier.weight(1f))
                            if (m.route != null) Text("›", style = Txt.title.copy(color = c))
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("quests" to "QUEST", "gate" to "GATE", "shop" to "SHOP").forEach { (r, label) ->
                            SystemButton(label, SysColors.Cyan, { onRoute(r); onDismiss() }, Modifier.weight(1f), primary = false)
                        }
                    }
                    SystemButton("ปิดหน้าต่าง", SysColors.Muted, onDismiss, primary = false)
                }
}
