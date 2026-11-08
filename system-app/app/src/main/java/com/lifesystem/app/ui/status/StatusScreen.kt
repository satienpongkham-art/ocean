package com.lifesystem.app.ui.status

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.components.BigNumber
import com.lifesystem.app.ui.components.Chip
import com.lifesystem.app.ui.components.LabeledBar
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.PixelSprite
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.Sprites
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.progression.Progression
import com.lifesystem.engine.stats.StatRanks

data class StatusUi(
    val name: String = "ผู้เล่น",
    val level: Int = 1,
    val exp: Int = 0,
    val gold: Int = 0,
    val condition: Condition = Condition.NORMAL,
    val sleepH: Double? = null,
    val heightCm: Double = 0.0,
    val weight: Double? = null,
    val waist: Double? = null,
    val ranks: Map<Stat, Rank> = emptyMap(),
    val overall: Rank = Rank.UNKNOWN,
)

suspend fun loadStatus(repo: Repository, today: Long): StatusUi {
    val p = repo.profile() ?: return StatusUi()
    val w = repo.wallet()
    val weight = repo.latest(MeasureType.WEIGHT)?.value
    val waist = repo.latest(MeasureType.WAIST)?.value
    val pushup = repo.latest(MeasureType.PUSHUP_MAX)?.value?.toInt()
    val rope = repo.latest(MeasureType.ROPE_SEC)?.value?.toInt()
    val sleep = repo.latest(MeasureType.SLEEP_H)?.value
    val str = StatRanks.str(pushup)
    val ranks = mapOf(
        Stat.STR to str,
        Stat.VIT to StatRanks.vit(waist, p.heightCm, str),
        Stat.AGI to StatRanks.agi(rope),
        Stat.CHA to Rank.UNKNOWN,
        Stat.MND to Rank.UNKNOWN,
        Stat.INT to Rank.UNKNOWN,
    )
    return StatusUi(p.name, w.level, w.exp, w.gold, Progression.conditionFromSleep(sleep), sleep, p.heightCm, weight, waist, ranks, StatRanks.overall(ranks.values.toList()))
}

private val statSource = mapOf(
    Stat.STR to "วิดพื้นสูงสุด (CSEP)", Stat.VIT to "รอบเอว ÷ ส่วนสูง (NICE)", Stat.AGI to "เชือกกระโดดต่อเนื่อง",
    Stat.CHA to "สิว · สกินแคร์ · ไมล์สโตน", Stat.MND to "PSS-10 · ทำตามกฎ", Stat.INT to "EF SET · หนังสือที่จบ",
)

@Composable
fun StatusScreen(repo: Repository, today: Long) {
    var ui by remember { mutableStateOf(StatusUi()) }
    LaunchedEffect(Unit) { ui = loadStatus(repo, today) }
    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ScreenHeader("STATUS", "SYS://PLAYER")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
            Column {
                Text("ผู้เล่น", style = Txt.sub)
                Text(ui.name, style = Txt.title.copy(fontSize = 28.sp))
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(horizontalAlignment = Alignment.End) { Text("LEVEL", style = Txt.sub); BigNumber("${ui.level}") }
                RankHex(ui.overall)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            PanelBox { PixelSprite(Sprites.avatarStage1, pixel = 6.dp) }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                val c = ui.condition
                Chip("CONDITION · ${c.name}", when (c) { Condition.OPTIMAL -> SysColors.Mint; Condition.NORMAL -> SysColors.Cyan; Condition.FATIGUED -> SysColors.CrimsonText })
                Text(ui.sleepH?.let { "นอนเมื่อคืน %.1f ชม.".format(it) } ?: "ยังไม่มีข้อมูลการนอน", style = Txt.sub)
                val need = Progression.expNeeded(ui.level)
                LabeledBar("EXP", "${ui.exp} / $need", ui.exp / need.toFloat(), SysColors.Cyan)
                Text("ด่านเลเวลถัดไป: ประเมินวันอาทิตย์ ต้องดีขึ้นอย่างน้อย 1 ตัวชี้วัด", style = Txt.sub)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            BodyCell("สูง", if (ui.heightCm > 0) "%.0f".format(ui.heightCm) else "—", Modifier.weight(1f))
            BodyCell("หนัก", ui.weight?.let { "%.1f".format(it) } ?: "—", Modifier.weight(1f))
            BodyCell("เอว", ui.waist?.let { "%.1f".format(it) } ?: "—", Modifier.weight(1f))
            BodyCell("WHtR", if (ui.waist != null && ui.heightCm > 0) "%.2f".format(ui.waist!! / ui.heightCm) else "—", Modifier.weight(1f))
        }
        listOf(Stat.STR, Stat.VIT, Stat.AGI, Stat.CHA, Stat.MND, Stat.INT).chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                pair.forEach { s -> StatCell(s, ui.ranks[s] ?: Rank.UNKNOWN, Modifier.weight(1f)) }
            }
        }
        PanelBox(Modifier.fillMaxWidth(), SysColors.Gold) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("G · เงินในเกม", style = Txt.sys.copy(color = SysColors.Gold))
                Text("${ui.gold} G", style = Txt.num.copy(color = Color(0xFFFFE7A8)))
            }
        }
    }
}

@Composable
private fun BodyCell(k: String, v: String, modifier: Modifier) {
    Column(modifier.border(1.dp, SysColors.Cyan.copy(alpha = 0.25f)).padding(vertical = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(k, style = Txt.sub)
        Text(v, style = Txt.num)
    }
}

@Composable
private fun StatCell(stat: Stat, rank: Rank, modifier: Modifier) {
    val c = if (rank == Rank.UNKNOWN) SysColors.Muted else SysColors.stat(stat)
    Row(modifier.border(1.dp, SysColors.Cyan.copy(alpha = 0.3f)).padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.size(34.dp).border(1.dp, c), contentAlignment = Alignment.Center) {
            Text(if (rank == Rank.UNKNOWN) "?" else rank.name, style = Txt.num.copy(color = c, fontSize = 18.sp))
        }
        Column {
            Text(stat.name, style = Txt.num.copy(letterSpacing = 2.sp))
            Text(statSource[stat] ?: "", style = Txt.sub.copy(fontSize = 10.sp))
        }
    }
}

@Composable
private fun RankHex(rank: Rank) {
    Box(contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(54.dp, 60.dp)) {
            val w = size.width; val h = size.height
            val p = Path().apply { moveTo(w / 2, 0f); lineTo(w, h * 0.25f); lineTo(w, h * 0.75f); lineTo(w / 2, h); lineTo(0f, h * 0.75f); lineTo(0f, h * 0.25f); close() }
            drawPath(p, SysColors.Cyan)
            val inset = 2.dp.toPx()
            val q = Path().apply { moveTo(w / 2, inset); lineTo(w - inset, h * 0.25f + inset / 2); lineTo(w - inset, h * 0.75f - inset / 2); lineTo(w / 2, h - inset); lineTo(inset, h * 0.75f - inset / 2); lineTo(inset, h * 0.25f + inset / 2); close() }
            drawPath(q, Color(0xFF071A33))
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("RANK", style = Txt.sub.copy(fontSize = 9.sp))
            Text(if (rank == Rank.UNKNOWN) "E" else rank.name, style = Txt.num.copy(fontSize = 22.sp))
        }
    }
}
