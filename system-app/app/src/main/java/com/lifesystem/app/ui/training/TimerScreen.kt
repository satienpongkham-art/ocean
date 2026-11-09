package com.lifesystem.app.ui.training

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.components.BigNumber
import com.lifesystem.app.ui.components.HudBar
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val howTo = mapOf(
    "plank" to "แพลงก์ศอก: ลำตัวตรงจากหัวถึงส้นเท้า แขม่วท้อง · กดเริ่ม วางมือถือ กดหยุดเมื่อพัก (สะสมได้หลายรอบ)",
    "emg_wallsit" to "นั่งพิงกำแพง เข่า 90° หลังแนบผนัง · กดเริ่ม แล้วกดหยุดเมื่อพัก (สะสมได้)",
    "db_curl" to "ดัมเบลเคิร์ล: ศอกแนบลำตัว ยกช้า ลงช้า 2 วินาที · จบเซ็ตแล้วพัก 60 วินาที",
    "db_row" to "ดัมเบลโรว์: โน้มตัว หลังตรง ดึงข้อศอกไปด้านหลัง · จบเซ็ตแล้วพัก 60 วินาที",
    "db_press" to "ดัมเบลเพรส: นั่งหลังตรง ดันขึ้นเหนือศีรษะ ไม่แอ่นหลัง · จบเซ็ตแล้วพัก 60 วินาที",
)

/** Timed holds (plank, wall sit) and set-based dumbbell work with a rest timer. Honour-based in Round 2. */
@Composable
fun TimerScreen(repo: Repository, today: Long, questId: String) {
    val scope = rememberCoroutineScope()
    val board by remember(today) { repo.board(today) }.collectAsStateWithLifecycle(initialValue = emptyList())
    val q = board.firstOrNull { it.questId == questId }
    val sets = questId.startsWith("db_")
    var start by remember { mutableLongStateOf(0L) }
    var now by remember { mutableLongStateOf(0L) }
    var restUntil by remember { mutableLongStateOf(0L) }
    LaunchedEffect(start, restUntil) { while (start > 0 || restUntil > System.currentTimeMillis()) { now = System.currentTimeMillis(); delay(200) } }

    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        ScreenHeader(if (sets) "DUMBBELL" else "TIMER", "${q?.progress ?: 0}/${q?.target ?: 0} ${q?.unit ?: ""}")
        Text(q?.title ?: "—", style = Txt.title)
        Text(howTo[questId] ?: "", style = Txt.body.copy(color = SysColors.Sub))
        HudBar(if (q == null || q.target == 0) 0f else q.progress / q.target.toFloat(), SysColors.Cyan)
        val windowOpen = q?.openAt(java.time.LocalTime.now().let { it.hour * 60 + it.minute }) ?: true
        if (!windowOpen) Text("นอกเวลาของภารกิจนี้ · นับไม่ได้", style = Txt.body.copy(color = SysColors.CrimsonText))
        if (sets) {
            val resting = restUntil > now
            BigNumber(if (resting) "พัก ${((restUntil - now) / 1000) + 1}" else "เซ็ต ${(q?.progress ?: 0) + 1}", size = 44)
            SystemButton("จบเซ็ต", SysColors.Cyan, {
                scope.launch { repo.addProgress(today, questId, 1) }
                restUntil = System.currentTimeMillis() + 60_000; now = System.currentTimeMillis()
            }, enabled = q != null && !q.done && !resting && windowOpen)
        } else {
            val running = start > 0
            BigNumber("%d วิ".format(if (running) (now - start) / 1000 else 0), size = 56)
            if (!running) SystemButton("เริ่มจับเวลา", SysColors.Cyan, { start = System.currentTimeMillis(); now = start }, enabled = q != null && !q.done && windowOpen)
            else SystemButton("หยุด · บันทึก", SysColors.Cyan, {
                val sec = ((System.currentTimeMillis() - start) / 1000).toInt(); start = 0
                scope.launch { repo.addProgress(today, questId, sec) }
            })
        }
        Text("เจ็บแปลบที่ข้อต่อให้หยุดทันที · ไม่ใช่การแข่งความเร็ว ท่าถูกสำคัญกว่าจำนวน", style = Txt.sub)
    }
}
