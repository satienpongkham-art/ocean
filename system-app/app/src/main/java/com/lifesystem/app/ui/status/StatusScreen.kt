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
import com.lifesystem.app.data.AvatarLook
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.avatarLook
import com.lifesystem.app.data.qty
import com.lifesystem.app.data.ranks
import com.lifesystem.app.data.useExpScroll
import com.lifesystem.app.data.usePenaltyShield
import com.lifesystem.app.data.useRestTicket
import com.lifesystem.app.data.waistDrop
import com.lifesystem.app.ui.components.AvatarArt
import com.lifesystem.app.ui.components.AvatarView
import com.lifesystem.app.ui.components.LineChart
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.engine.achievements.Achievements
import com.lifesystem.engine.avatar.AvatarStage
import com.lifesystem.engine.job.Job
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
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
    val look: AvatarLook = AvatarLook(),
    val waistDrop: Double? = null,
    val items: Map<String, Int> = emptyMap(),
    val weights: List<Double> = emptyList(),
    val waists: List<Double> = emptyList(),
    val pushups: List<Double> = emptyList(),
    val sleeps: List<Double> = emptyList(),
)

suspend fun loadStatus(repo: Repository, today: Long): StatusUi {
    val p = repo.profile() ?: return StatusUi()
    val w = repo.wallet()
    val ranks = repo.ranks()
    val sleep = repo.latest(MeasureType.SLEEP_H)?.value
    suspend fun series(type: String) = repo.recent(type, 30).first().reversed().map { it.value }
    return StatusUi(
        p.name, w.level, w.exp, w.gold, Progression.conditionFromSleep(sleep), sleep, p.heightCm,
        repo.latest(MeasureType.WEIGHT)?.value, repo.latest(MeasureType.WAIST)?.value, ranks, StatRanks.overall(ranks.values.toList()),
        repo.avatarLook(), repo.waistDrop(),
        listOf("EXP_SCROLL", "REST_TICKET", "PENALTY_SHIELD", "COSMETIC_SHARD").associateWith { repo.qty(it) },
        series(MeasureType.WEIGHT), series(MeasureType.WAIST), series(MeasureType.PUSHUP_MAX), series(MeasureType.SLEEP_H),
    )
}

private val itemInfo = listOf(
    Triple("EXP_SCROLL", "ม้วน EXP ×2", "วันนี้ได้ EXP สองเท่า"),
    Triple("REST_TICKET", "ตั๋วพัก", "พักวันนี้ ไม่โดนลงโทษ แต่ไม่ได้รางวัล"),
    Triple("PENALTY_SHIELD", "โล่กันโทษ", "ยกเลิกเควสต์ลงโทษวันนี้ (เดือนละครั้ง)"),
    Triple("COSMETIC_SHARD", "เศษประตูมิติ", "สะสม 10 ชิ้น แลกออร่าพิเศษในร้าน"),
)

/** What the next avatar stage needs (round 1.5 rule R10). */
private fun nextStageHint(stage: Int, drop: Double?): String = when (stage) {
    1 -> "ร่างถัดไป: เอวลด 3 ซม. หรือ STR แรงก์ D"
    2 -> "ร่างถัดไป: เอวลด 6 ซม. หรือ STR แรงก์ C"
    3 -> "ร่างถัดไป: เอวลด 10 ซม. และ STR แรงก์ B"
    4 -> "ร่างถัดไป: เอวลด 14 ซม. และ STR แรงก์ A"
    else -> "ร่างสูงสุดแล้ว"
} + (drop?.let { " · ตอนนี้ลดแล้ว %.1f ซม.".format(it) } ?: "")

private val statSource = mapOf(
    Stat.STR to "วิดพื้นสูงสุด (CSEP)", Stat.VIT to "รอบเอว ÷ ส่วนสูง (NICE)", Stat.AGI to "เชือกกระโดดต่อเนื่อง",
    Stat.CHA to "สิว · สกินแคร์ · ไมล์สโตน", Stat.MND to "PSS-10 · ทำตามกฎ", Stat.INT to "EF SET · หนังสือที่จบ",
)

@Composable
fun StatusScreen(repo: Repository, today: Long) {
    var ui by remember { mutableStateOf(StatusUi()) }
    var refresh by remember { mutableIntStateOf(0) }
    var msg by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    LaunchedEffect(refresh) { ui = loadStatus(repo, today) }
    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ScreenHeader("STATUS", "SYS://PLAYER")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
            Column {
                Text("ผู้เล่น", style = Txt.sub)
                Text(ui.name, style = Txt.title.copy(fontSize = 28.sp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ui.look.titleId?.let { Achievements.byId(it) }?.let { Chip("「${it.name}」", SysColors.Gold) }
                    ui.look.job?.let { j -> runCatching { Job.valueOf(j) }.getOrNull() }?.let { Chip("CLASS · ${it.title}", SysColors.Hidden) }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(horizontalAlignment = Alignment.End) { Text("LEVEL", style = Txt.sub); BigNumber("${ui.level}") }
                RankHex(ui.overall)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            PanelBox {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    AvatarView(ui.look.stage, pixel = 5.dp, outfit = ui.look.outfit, weapon = ui.look.weapon, aura = ui.look.aura?.let { AvatarArt.auras[it] })
                    Text("ร่าง ${ui.look.stage}/${AvatarStage.MAX}", style = Txt.sys.copy(fontSize = 10.sp))
                }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                val c = ui.condition
                Chip("CONDITION · ${c.name}", when (c) { Condition.OPTIMAL -> SysColors.Mint; Condition.NORMAL -> SysColors.Cyan; Condition.FATIGUED -> SysColors.CrimsonText })
                Text(ui.sleepH?.let { "นอนเมื่อคืน %.1f ชม.".format(it) } ?: "ยังไม่มีข้อมูลการนอน", style = Txt.sub)
                val need = Progression.expNeeded(ui.level)
                LabeledBar("EXP", "${ui.exp} / $need", ui.exp / need.toFloat(), SysColors.Cyan)
                if (ui.exp >= Progression.expCap(ui.level)) Chip("[ LIMIT ] EXP เต็ม · รอชนะบอสวันอาทิตย์", SysColors.Emergency)
                else Text("เลเวลขึ้นเมื่อชนะบอสวันอาทิตย์ (ต้องดีขึ้นจริงอย่างน้อย 1 อย่าง)", style = Txt.sub)
                Text(nextStageHint(ui.look.stage, ui.waistDrop), style = Txt.sub.copy(color = SysColors.CyanHi))
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
                Text("G · เงินในเกม (ใช้ในแท็บ SHOP)", style = Txt.sys.copy(color = SysColors.Gold))
                Text("${ui.gold} G", style = Txt.num.copy(color = Color(0xFFFFE7A8)))
            }
        }
        ScreenHeader("INVENTORY", "ไอเทมจากประตูและบอส")
        itemInfo.forEach { (id, name, desc) ->
            val n = ui.items[id] ?: 0
            Row(Modifier.fillMaxWidth().border(1.dp, SysColors.Cyan.copy(alpha = 0.25f)).padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("$name × $n", style = Txt.body.copy(color = if (n > 0) Color.White else SysColors.Muted))
                    Text(desc, style = Txt.sub)
                }
                if (id != "COSMETIC_SHARD") SystemButton("ใช้", SysColors.Mint, {
                    scope.launch {
                        val ok = when (id) {
                            "EXP_SCROLL" -> repo.useExpScroll(today)
                            "REST_TICKET" -> repo.useRestTicket(today)
                            else -> repo.usePenaltyShield(today)
                        }
                        msg = if (ok) "ใช้ $name แล้ว" else "ใช้ไม่ได้ตอนนี้"
                        refresh++
                    }
                }, Modifier.width(80.dp), primary = false, enabled = n > 0)
            }
        }
        if (msg.isNotEmpty()) Text(msg, style = Txt.body.copy(color = SysColors.Mint))
        ScreenHeader("RECORDS", "พัฒนาการจริง")
        PanelBox(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                LineChart("น้ำหนัก (กก.)", ui.weights, SysColors.Mint, { "%.1f".format(it) })
                LineChart("รอบเอว (ซม.)", ui.waists, SysColors.stat(Stat.VIT), { "%.1f".format(it) })
                LineChart("วิดพื้นรวดเดียวสูงสุด", ui.pushups, SysColors.stat(Stat.STR), { "%.0f".format(it) })
                LineChart("ชั่วโมงนอน", ui.sleeps, SysColors.Hidden, { "%.1f".format(it) })
            }
        }
        Text("", modifier = Modifier.padding(bottom = 8.dp))
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
            Text(if (rank == Rank.UNKNOWN) "?" else rank.name, style = Txt.num.copy(fontSize = 22.sp))
        }
    }
}
