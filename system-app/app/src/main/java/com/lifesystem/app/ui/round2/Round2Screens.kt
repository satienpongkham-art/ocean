package com.lifesystem.app.ui.round2

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.Keys
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.addExpense
import com.lifesystem.app.data.getSetting
import com.lifesystem.app.data.putSetting
import com.lifesystem.app.data.skillInput
import com.lifesystem.app.data.weeklyReport
import com.lifesystem.app.lock.GuardService
import com.lifesystem.app.system.SystemSound
import com.lifesystem.app.ui.components.BigNumber
import com.lifesystem.app.ui.components.ChoiceChip
import com.lifesystem.app.ui.components.HudBar
import com.lifesystem.app.ui.components.LabeledBar
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SysField
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.chapters.Chapters
import com.lifesystem.engine.report.Report
import com.lifesystem.engine.skills.SkillTree
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate

@Composable
private fun Screen(title: String, right: String = "", content: @Composable () -> Unit) {
    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ScreenHeader(title, right)
        content()
        Box(Modifier.padding(bottom = 24.dp))
    }
}

/** Focus Dungeon: 25/50-minute deep work; other apps are locked while it runs (when the lock service is on). */
@Composable
fun FocusScreen(repo: Repository, today: Long) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var until by remember { mutableLongStateOf(0L) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var msg by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { until = repo.getSetting(GuardService.FOCUS_UNTIL, "0").toLongOrNull() ?: 0L }
    LaunchedEffect(until) {
        while (until > 0) {
            now = System.currentTimeMillis()
            if (now >= until) {
                val key = "focus_credit_$until"
                if (repo.getSetting(key, "") != "1") {
                    repo.putSetting(key, "1"); repo.addProgress(today, "focus", 1)
                    SystemSound.play(ctx, SystemSound.Kind.CLEAR); msg = "ดันเจี้ยนเคลียร์ · ได้ 1 รอบ"
                }
                repo.putSetting(GuardService.FOCUS_UNTIL, "0"); until = 0
            }
            delay(1000)
        }
    }
    Screen("FOCUS DUNGEON", "ปัญญา") {
        Text("ทำงาน/อ่านหนังสืออย่างเดียว · ระหว่างนี้แอปอื่นถูกล็อก (ถ้าเปิดสิทธิ์ล็อกแอปไว้) · ออกก่อนเวลา = ไม่ได้รอบ", style = Txt.sub)
        if (until > 0) {
            val left = ((until - now) / 1000).coerceAtLeast(0)
            BigNumber("%02d:%02d".format(left / 60, left % 60), size = 64)
            HudBar(1f - left / ((until - now).coerceAtLeast(1) / 1000f + left).coerceAtLeast(1f), SysColors.Hidden)
            SystemButton("ถอนตัว (ไม่ได้รอบ)", SysColors.Crimson, { scope.launch { repo.putSetting(GuardService.FOCUS_UNTIL, "0"); until = 0; msg = "ถอนตัวจากดันเจี้ยน" } }, primary = false)
        } else {
            listOf(25, 50).forEach { m ->
                SystemButton("เข้าดันเจี้ยน $m นาที", SysColors.Hidden, {
                    scope.launch { val u = System.currentTimeMillis() + m * 60_000L; repo.putSetting(GuardService.FOCUS_UNTIL, u.toString()); until = u; GuardService.sync(ctx) }
                })
            }
        }
        if (msg.isNotEmpty()) Text(msg, style = Txt.body.copy(color = SysColors.Mint))
    }
}

/** Two-tap expense log; today's spend decides the budget quest at day close. */
@Composable
fun FinanceScreen(repo: Repository, today: Long) {
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf("อาหาร") }
    var daily by remember { mutableIntStateOf(285) }
    val items by remember(today) { repo.dao.expensesFlow(today) }.collectAsStateWithLifecycle(initialValue = emptyList())
    LaunchedEffect(Unit) { daily = repo.profile()?.dailyBudget ?: 285 }
    val spent = items.sumOf { it.amount }
    Screen("FINANCE", "งบวันนี้ ฿$daily") {
        LabeledBar("ใช้ไปวันนี้", "฿$spent / ฿$daily", spent / daily.coerceAtLeast(1).toFloat(), if (spent > daily) SysColors.Crimson else SysColors.Gold)
        SysField("จำนวนเงิน (บาท)", amount, { amount = it.filter(Char::isDigit) }, number = true)
        listOf("อาหาร", "เดินทาง", "เกม", "ของใช้", "อื่น ๆ").chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { row.forEach { c -> ChoiceChip(c, cat == c, SysColors.Gold) { cat = c } } }
        }
        SystemButton("บันทึก", SysColors.Gold, { amount.toIntOrNull()?.let { a -> scope.launch { repo.addExpense(today, a, cat) } }; amount = "" })
        Text("กฎ 24 ชม.: ของไม่จำเป็นเกิน 300 บาท และทุกการเติมเกม ให้ใส่ไว้ในของรางวัล (SHOP) แล้วรอ 24 ชม. ก่อนซื้อ", style = Txt.sub)
        items.reversed().forEach { e -> Text("฿${e.amount} · ${e.category}", style = Txt.body) }
    }
}

/** Sunday report card (round 2 pick). */
@Composable
fun ReportScreen(repo: Repository, today: Long) {
    var r by remember { mutableStateOf<Report?>(null) }
    val names = mapOf("sleep" to "เข้านอนตรงเวลา", "pushup" to "วิดพื้น", "squat" to "สควอท", "journal" to "ไดอารี่", "wake" to "ตื่นตามเวลา", "read" to "อ่านหนังสือ", "english" to "ภาษาอังกฤษ", "weigh" to "ชั่งน้ำหนัก")
    LaunchedEffect(Unit) { r = repo.weeklyReport(today); repo.putSetting(Keys.REPORT_SEEN, today.toString()) }
    Screen("WEEKLY REPORT", "7 วันที่ผ่านมา") {
        val rep = r ?: return@Screen
        PanelBox(Modifier.fillMaxWidth(), SysColors.Gold) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                LabeledBar("ทำเควสต์บังคับ", "${rep.completionPct}%", rep.completionPct / 100f, SysColors.Gold)
                rep.bestDay?.let { Text("วันที่ดีที่สุด: ${LocalDate.ofEpochDay(it)}", style = Txt.body) }
                rep.weightChange?.let { Text("น้ำหนัก %+.1f กก.".format(it), style = Txt.body) }
                rep.waistChange?.let { Text("รอบเอว %+.1f ซม.".format(it), style = Txt.body) }
            }
        }
        Text("พลาดบ่อย", style = Txt.sys)
        rep.topMissed.forEach { (id, n) -> Text("· ${names[id] ?: id} ($n วัน)", style = Txt.body) }
        Text("คำแนะนำจาก System", style = Txt.sys)
        rep.advice.forEach { Text("◆ $it", style = Txt.body) }
    }
}

@Composable
fun SkillsScreen(repo: Repository) {
    var unlocked by remember { mutableStateOf(emptySet<String>()) }
    LaunchedEffect(Unit) { unlocked = SkillTree.unlocked(repo.skillInput()) }
    Screen("SKILL TREE", "${unlocked.size} / ${SkillTree.all.size}") {
        Text("ปลดล็อกจากผลจริง · แต่ละทักษะให้ EXP +5% กับหมวดของมัน", style = Txt.sub)
        SkillTree.all.groupBy { it.stat }.forEach { (stat, skills) ->
            Text(stat.name, style = Txt.sys.copy(color = SysColors.stat(stat)))
            skills.forEach { s ->
                val on = s.id in unlocked
                PanelBox(Modifier.fillMaxWidth(), if (on) SysColors.stat(stat) else SysColors.Muted) {
                    Column {
                        Text((if (on) "◆ " else "◇ ") + s.name, style = Txt.body.copy(color = if (on) Color.White else SysColors.Muted))
                        Text(s.requirement, style = Txt.sub)
                    }
                }
            }
        }
    }
}

@Composable
fun ChaptersScreen(repo: Repository) {
    var seen by remember { mutableStateOf(emptySet<Int>()) }
    LaunchedEffect(Unit) {
        seen = repo.getSetting(Keys.CHAPTERS, "").split(',').mapNotNull { it.trim().toIntOrNull() }.toSet()
        repo.putSetting(Keys.CHAPTER_NEW, "")
    }
    Screen("CHAPTERS", "${seen.size} / ${Chapters.all.size}") {
        Chapters.all.forEach { c ->
            val on = c.n in seen
            PanelBox(Modifier.fillMaxWidth(), if (on) SysColors.Hidden else SysColors.Muted) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("บทที่ ${c.n} · " + (if (on) c.title else "???"), style = Txt.body.copy(color = if (on) Color.White else SysColors.Muted))
                    Text(if (on) c.text else "ปลดล็อก: ${c.requirement}", style = Txt.sub)
                }
            }
        }
    }
}

/** Vision Board: images and text shared from other apps (IG, TikTok, browser) via the share menu. */
@Composable
fun VisionScreen(repo: Repository) {
    val ctx = LocalContext.current
    var images by remember { mutableStateOf(emptyList<ImageBitmap>()) }
    var texts by remember { mutableStateOf(emptyList<String>()) }
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            images = File(ctx.filesDir, "vision").listFiles().orEmpty().sortedByDescending { it.name }
                .mapNotNull { f -> runCatching { BitmapFactory.decodeFile(f.path, BitmapFactory.Options().apply { inSampleSize = 2 })?.asImageBitmap() }.getOrNull() }
        }
        texts = repo.getSetting("vision_texts", "").lines().filter { it.isNotBlank() }
    }
    Screen("VISION BOARD", "เป้าหมายที่อยากเป็น") {
        Text("เพิ่มได้จากแอปอื่น: กด แชร์ → System · เก็บในเครื่องนี้เท่านั้น", style = Txt.sub)
        images.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { Image(it, null, Modifier.weight(1f).aspectRatio(0.8f).border(1.dp, SysColors.Hidden.copy(alpha = 0.5f)), contentScale = ContentScale.Crop) }
                if (row.size == 1) Box(Modifier.weight(1f))
            }
        }
        texts.forEach { Text("◆ $it", style = Txt.body) }
        if (images.isEmpty() && texts.isEmpty()) Text("ยังว่างอยู่ · ลองแชร์รูปสไตล์ที่อยากเป็นมาที่ System", style = Txt.body)
    }
}

