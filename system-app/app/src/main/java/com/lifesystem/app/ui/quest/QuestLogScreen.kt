package com.lifesystem.app.ui.quest

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.ui.components.Chip
import com.lifesystem.app.ui.components.HudBar
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.maintenance.Maintenance
import com.lifesystem.engine.model.Group
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.model.Verify

private val groupLabel = mapOf(
    Group.MORNING to ("เช้า" to "07:00"), Group.DAY to ("ระหว่างวัน" to "ทั้งวัน"),
    Group.TRAINING to ("ฝึกร่างกาย" to "ภายใน 23:59"), Group.NIGHT to ("คืน" to "ก่อนนอน"),
)

private val verifyLabel = mapOf(
    Verify.SENSOR.name to "เซนเซอร์", Verify.AUTO.name to "อัตโนมัติ", Verify.NUMBER.name to "กรอกตัวเลข",
    Verify.PHOTO.name to "รูปยืนยัน", Verify.SELF.name to "ยืนยันเอง",
)

fun QuestEntity.displayTitle(): String =
    if (type == QuestType.MAINTENANCE.name) "ซ่อมบำรุง · " + Maintenance.title(questId.removePrefix("mt_")) else title

/**
 * Daily quest board. [onOpen] routes SENSOR quests to training and NUMBER/AUTO quests to their log screen.
 */
@Composable
fun QuestLogScreen(vm: QuestViewModel, onOpen: (QuestEntity) -> Unit) {
    val board by vm.board.collectAsStateWithLifecycle()
    val dayNumber by vm.dayNumber.collectAsStateWithLifecycle()
    val required = board.filter { it.type != QuestType.DAILY_SIDE.name }
    val done = required.count { it.done }
    val allDone = required.isNotEmpty() && done == required.size
    LazyColumn(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        item {
            ScreenHeader("QUEST LOG", "DAY %02d".format(dayNumber))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("เควสต์หลัก", style = Txt.body.copy(fontSize = 13.sp))
                        Text("$done / ${required.size}", style = Txt.num.copy(color = SysColors.Cyan, fontSize = 13.sp))
                    }
                    HudBar(if (required.isEmpty()) 0f else done / required.size.toFloat(), SysColors.Cyan, Modifier.padding(top = 4.dp))
                }
                Box(Modifier.padding(start = 12.dp)) {
                    Chip(if (allDone) "COMPLETE" else "IN PROGRESS", if (allDone) SysColors.Mint else SysColors.CrimsonText)
                }
            }
        }
        Group.values().forEach { g ->
            val rows = board.filter { it.grp == g.name }
            if (rows.isEmpty()) return@forEach
            item {
                val (name, time) = groupLabel.getValue(g)
                Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(name, style = Txt.body.copy(color = Color.White, fontSize = 15.sp))
                    Text(time, style = Txt.code)
                }
            }
            items(rows, key = { it.questId }) { q -> QuestRow(q, onTick = { vm.tick(q.questId) }, onOpen = { onOpen(q) }) }
        }
        item {
            Box(Modifier.fillMaxWidth().padding(vertical = 12.dp).border(1.dp, SysColors.Hidden.copy(alpha = 0.6f)).padding(12.dp)) {
                Column {
                    Text("HIDDEN QUEST · ???", style = Txt.sys.copy(color = SysColors.Hidden))
                    Text("\"เมื่อพระอาทิตย์ยังไม่ตื่น ผู้ที่ตื่นก่อนจะได้รับ...\"", style = Txt.body.copy(color = Color(0xFFDDD0FF)))
                }
            }
        }
    }
}

@Composable
private fun QuestRow(q: QuestEntity, onTick: () -> Unit, onOpen: () -> Unit) {
    val manual = q.verify == Verify.SELF.name
    val accent = when (q.type) {
        QuestType.PENALTY.name -> SysColors.Crimson
        QuestType.MAINTENANCE.name -> SysColors.Emergency
        else -> SysColors.Cyan
    }
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp)
            .clickable(role = Role.Button) { if (manual) onTick() else onOpen() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            Modifier.size(26.dp).background(if (q.done) accent else Color.Transparent).border(1.dp, accent.copy(alpha = 0.7f)),
            contentAlignment = Alignment.Center,
        ) { if (q.done) Text("✓", style = Txt.num.copy(color = SysColors.Void)) }
        Column(Modifier.weight(1f)) {
            Text(q.displayTitle(), style = Txt.body.copy(color = if (q.done) SysColors.Muted else SysColors.Text))
            val stat = runCatching { Stat.valueOf(q.stat) }.getOrDefault(Stat.VIT)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(q.stat, style = Txt.sys.copy(color = SysColors.stat(stat), fontSize = 10.sp))
                Text(verifyLabel[q.verify] ?: "", style = Txt.sub)
                if (q.target > 1) Text("${q.progress}/${q.target} ${q.unit}", style = Txt.sub.copy(color = SysColors.CyanHi))
            }
        }
        Chip(
            when (q.type) { QuestType.DAILY_SIDE.name -> "SIDE"; QuestType.PENALTY.name -> "PENALTY"; QuestType.MAINTENANCE.name -> "MAINT"; QuestType.CHAIN.name -> "CHAIN"; else -> "MAIN" },
            if (q.type == QuestType.DAILY_SIDE.name) SysColors.Sub else accent,
        )
    }
}
