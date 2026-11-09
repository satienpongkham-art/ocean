package com.lifesystem.app.ui.gate

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.AvatarLook
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.avatarLook
import com.lifesystem.app.data.chooseJob
import com.lifesystem.app.data.fightBoss
import com.lifesystem.app.data.ranks
import com.lifesystem.app.ui.components.BigNumber
import com.lifesystem.app.ui.components.ChoiceChip
import com.lifesystem.app.ui.components.HudBar
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.QuestInfoWindow
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.quest.CategoryAvatar
import com.lifesystem.app.ui.quest.toGoal
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.boss.Boss
import com.lifesystem.engine.gate.Drop
import com.lifesystem.engine.gate.GateGenerator
import com.lifesystem.engine.job.Job
import com.lifesystem.engine.job.JobRules
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.progression.GateResult
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalTime

private val dropName = mapOf(
    Drop.EXP_SCROLL to "ม้วน EXP ×2", Drop.REST_TICKET to "ตั๋วพัก", Drop.PENALTY_SHIELD to "โล่กันโทษ", Drop.COSMETIC_SHARD to "เศษประตูมิติ",
)

private val metricName = mapOf("waist" to "รอบเอว", "weight" to "น้ำหนัก", "pushup" to "วิดพื้น", "plank" to "แพลงก์", "rope" to "เชือก")

private fun hhmm(min: Int) = "%02d:%02d".format(min / 60 % 24, min % 60)

/** GATE tab: today's gates, the weekly boss and the class change. */
@Composable
fun GateScreen(repo: Repository, today: Long, onTrain: (String) -> Unit, onBodyLog: () -> Unit) {
    val board by remember(today) { repo.board(today) }.collectAsStateWithLifecycle(initialValue = emptyList())
    var look by remember { mutableStateOf(AvatarLook()) }
    var minute by remember { mutableIntStateOf(nowMinute()) }
    LaunchedEffect(Unit) { look = repo.avatarLook(); while (true) { delay(15_000); minute = nowMinute() } }

    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        ScreenHeader("GATE", "ประตูมิติ · บอส · อาชีพ")
        val gates = board.filter { it.type == QuestType.GATE.name }.groupBy { it.questId.substringBefore('_') }
        if (gates.isEmpty()) {
            PanelBox(Modifier.fillMaxWidth()) { Text("วันนี้ไม่มีประตูเปิด · ประตูสุ่มเปิดวันละ 0–2 ครั้ง มีหน้าต่างเด้งเตือนเมื่อเปิด", style = Txt.body) }
        }
        gates.toSortedMap().forEach { (key, qs) -> GateCard(today, key.removePrefix("gate").toIntOrNull() ?: 0, qs, minute, look, onTrain) }
        BossCard(repo, today, board, look, onTrain, onBodyLog)
        JobCard(repo, board)
        Box(Modifier.padding(bottom = 16.dp))
    }
}

private fun nowMinute() = LocalTime.now().let { it.hour * 60 + it.minute }

@Composable
private fun GateCard(today: Long, index: Int, qs: List<QuestEntity>, minute: Int, look: AvatarLook, onTrain: (String) -> Unit) {
    val open = qs.first().openMin ?: 0
    val close = qs.first().closeMin ?: 0
    val cleared = qs.all { it.done }
    val state = when {
        cleared -> "CLEARED · ได้ ${dropName.getValue(GateGenerator.drop(today, index))} (ได้รับตอนปิดวัน)"
        minute < open -> "เปิด ${hhmm(open)} · อีก ${open - minute} นาที"
        minute < close -> "เปิดอยู่ · เหลือ ${close - minute} นาที"
        else -> "FAILED · หมดเวลา → บทลงโทษพรุ่งนี้"
    }
    val accent = when {
        cleared -> SysColors.Mint
        minute in open until close -> SysColors.Emergency
        minute >= close -> SysColors.Crimson
        else -> SysColors.Cyan
    }
    QuestInfoWindow(
        title = "GATE $index",
        subtitle = "${qs.first().title.substringBefore(" ·")} · $state",
        accent = accent,
        goals = qs.map { it.toGoal(minute) },
        caution = if (!cleared && minute < close) "ทำทุกข้อภายใน ${hhmm(close)} · นับด้วยเซนเซอร์เท่านั้น" else null,
        avatar = { CategoryAvatar(look, "AGI") },
        onGoal = { g -> if (minute in open until close && !g.done) onTrain(g.id) },
    )
}

@Composable
private fun BossCard(repo: Repository, today: Long, board: List<QuestEntity>, look: AvatarLook, onTrain: (String) -> Unit, onBodyLog: () -> Unit) {
    val scope = rememberCoroutineScope()
    var result by remember { mutableStateOf<Boss.Outcome?>(null) }
    var stored by remember { mutableStateOf<Pair<Int, Boolean>?>(null) }
    LaunchedEffect(today) { stored = repo.dao.boss(today)?.let { it.damage to it.defeated } }
    if (!Boss.isBossDay(today)) {
        val days = (1..7).first { Boss.isBossDay(today + it) }
        PanelBox(Modifier.fillMaxWidth(), SysColors.Crimson) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("WEEKLY BOSS", style = Txt.sys.copy(color = SysColors.CrimsonText))
                Text("บอสครั้งถัดไป: วันอาทิตย์ (อีก $days วัน)", style = Txt.body)
                Text("วันนั้นวัดผลจริง: วิดพื้นรวดเดียว · แพลงก์ · รอบเอว/น้ำหนัก ดีขึ้น 1 อย่าง = ดาเมจ 35 · ชนะบอส = เลเวลอัป", style = Txt.sub)
            }
        }
        return
    }
    val bossQuests = board.filter { it.type == QuestType.BOSS.name }
    val damage = result?.damage ?: stored?.first ?: 0
    val defeated = result?.defeated ?: stored?.second ?: false
    QuestInfoWindow(
        title = "BOSS RAID",
        subtitle = "บอสประจำสัปดาห์ · HP ${if (defeated) 0 else (Boss.HP - damage).coerceAtLeast(0)} / ${Boss.HP}",
        accent = SysColors.Crimson,
        goals = bossQuests.map { it.toGoal(nowMinute()) } + listOf(com.lifesystem.app.ui.components.GoalRow("weigh_link", "ชั่งน้ำหนัก + วัดรอบเอว (BODY LOG)", 0, 1, board.firstOrNull { it.questId == "weigh" }?.done == true)),
        caution = "วัดให้ครบก่อน แล้วกด \"ท้าสู้บอส\" · ผลวัดต้องดีกว่าสัปดาห์ก่อนจริง",
        avatar = { CategoryAvatar(look, "STR", pixel = 3f) },
        onGoal = { g -> when (g.id) { "boss_pushup" -> onTrain(g.id); "weigh_link" -> onBodyLog() } },
    )
    HudBar(if (defeated) 0f else (Boss.HP - damage) / Boss.HP.toFloat(), SysColors.Crimson)
    if (bossQuests.any { it.questId == "boss_plank" && !it.done }) PlankTimer { sec ->
        scope.launch { repo.logMeasurement(MeasureType.PLANK_SEC, sec.toDouble()); repo.complete(today, "boss_plank") }
    }
    result?.let { o ->
        PanelBox(Modifier.fillMaxWidth(), if (o.defeated) SysColors.Gold else SysColors.Crimson) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(if (o.defeated) "BOSS DEFEATED · LEVEL UP!" else "บอสยังไม่ล้ม", style = Txt.title.copy(color = if (o.defeated) SysColors.Gold else SysColors.CrimsonText))
                Text("ดาเมจ ${o.damage} · ดีขึ้น: " + (o.improved.joinToString { metricName[it] ?: it }.ifEmpty { "ยังไม่มี" }), style = Txt.body)
                when (val r = o.result) {
                    is GateResult.NotEnoughExp -> Text("EXP ยังขาด ${r.missing} · ทำเควสต์ให้ครบแล้วสู้ใหม่สัปดาห์หน้า", style = Txt.sub)
                    is GateResult.RedFlag -> Text("⚠ ${r.reason} · System ไม่ให้เลเวลอัปสัปดาห์นี้เพื่อความปลอดภัย", style = Txt.sub.copy(color = SysColors.Emergency))
                    GateResult.NoImprovement -> Text("ยังไม่ดีขึ้นจากสัปดาห์ก่อน · สัปดาห์หน้าลองใหม่", style = Txt.sub)
                    is GateResult.Pass -> Text("ร่างกายดีขึ้นจริง · เลเวลขึ้นแล้ว", style = Txt.sub)
                }
            }
        }
    }
    if (stored == null && result == null) SystemButton("ท้าสู้บอส", SysColors.Crimson, { scope.launch { result = repo.fightBoss(today) } })
}

@Composable
private fun PlankTimer(onDone: (Int) -> Unit) {
    var start by remember { mutableLongStateOf(0L) }
    var now by remember { mutableLongStateOf(0L) }
    LaunchedEffect(start) { while (start > 0) { now = System.currentTimeMillis(); delay(200) } }
    PanelBox(Modifier.fillMaxWidth(), SysColors.Crimson) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("แพลงก์ให้นานที่สุด · กดเริ่มแล้ววางมือถือ กดหยุดเมื่อเข่าแตะพื้น", style = Txt.sub)
            BigNumber("%d วิ".format(if (start > 0) (now - start) / 1000 else 0), size = 40)
            if (start == 0L) SystemButton("เริ่มจับเวลา", SysColors.Crimson, { start = System.currentTimeMillis(); now = start }, primary = false)
            else SystemButton("หยุด · บันทึก", SysColors.Crimson, { val s = ((System.currentTimeMillis() - start) / 1000).toInt(); start = 0; onDone(s) })
        }
    }
}

@Composable
private fun JobCard(repo: Repository, board: List<QuestEntity>) {
    val scope = rememberCoroutineScope()
    var level by remember { mutableIntStateOf(1) }
    var job by remember { mutableStateOf<String?>(null) }
    var suggestion by remember { mutableStateOf<Job?>(null) }
    var pick by remember { mutableStateOf<Job?>(null) }
    var refresh by remember { mutableIntStateOf(0) }
    LaunchedEffect(refresh) { level = repo.wallet().level; job = repo.profile()?.job; suggestion = JobRules.pick(repo.ranks()) }
    val examPassed = board.filter { it.type == QuestType.GATE.name }.groupBy { it.questId.substringBefore('_') }.values.any { qs -> qs.all { it.done } }
    PanelBox(Modifier.fillMaxWidth(), SysColors.Hidden) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("CLASS CHANGE", style = Txt.sys.copy(color = SysColors.Hidden))
            when {
                job != null -> Text("อาชีพปัจจุบัน: ${runCatching { Job.valueOf(job!!).title }.getOrDefault(job!!)} · EXP +10% สำหรับเควสต์หมวดนี้", style = Txt.body)
                !JobRules.eligible(level) -> Text("ปลดล็อกที่เลเวล ${JobRules.UNLOCK_LEVEL} (ตอนนี้เลเวล $level) · สอบด้วยการผ่านประตูแรงก์ C", style = Txt.body)
                else -> {
                    Text(if (examPassed) "ผ่านการสอบแล้ว · เลือกอาชีพ (แนะนำจากหมวดที่เด่นที่สุด: ${suggestion?.title ?: "—"})" else "เลเวลถึงแล้ว · ผ่านประตูวันนี้ให้ได้ 1 ประตูเพื่อสอบเปลี่ยนอาชีพ", style = Txt.body)
                    if (examPassed) {
                        Job.values().toList().chunked(3).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { row.forEach { j -> ChoiceChip(j.title, pick == j, SysColors.Hidden) { pick = j } } }
                        }
                        SystemButton("ยืนยันอาชีพ (เปลี่ยนไม่ได้)", SysColors.Hidden, { pick?.let { j -> scope.launch { repo.chooseJob(j); refresh++ } } }, enabled = pick != null)
                    }
                }
            }
        }
    }
}

