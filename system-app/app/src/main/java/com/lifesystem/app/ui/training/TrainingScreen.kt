package com.lifesystem.app.ui.training

import android.app.Activity
import android.view.WindowManager
import androidx.compose.foundation.Canvas
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.shadowNow
import com.lifesystem.app.ui.components.BigNumber
import com.lifesystem.app.ui.components.Chip
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.sensors.Availability
import com.lifesystem.engine.sensors.Exercise
import com.lifesystem.engine.training.TrainingProgram
import kotlinx.coroutines.launch

private val placement = mapOf(
    Exercise.PUSHUP to "วางมือถือหงายบนพื้น ใต้หน้าอก · อกลงถึงจอจึงนับ · มือถือต้องนิ่งอยู่กับพื้น",
    Exercise.SQUAT to "กดเริ่ม → ใส่มือถือในกระเป๋ากางเกงหน้า → ยืนตรงนิ่ง ๆ 2 วินาที แล้วเริ่มสควอท · ต้นขาต้องลงเกือบขนานพื้น",
    Exercise.ROPE to "ใส่มือถือในกระเป๋ากางเกง แล้วกระโดดเชือก · นับเวลาที่กระโดดต่อเนื่อง",
    Exercise.SITUP to "กดเริ่ม → นอนหงาย วางมือถือแนบหน้าอก → นอนนิ่ง 2 วินาที แล้วเริ่มซิทอัพ · ต้องลุกขึ้นให้สุด",
    Exercise.WALK to "กดเริ่มแล้วเดินในบ้าน ถือหรือใส่กระเป๋า · ครบ 800 ก้าว (≈10 นาที) = 1 รอบ",
)

@Composable
fun TrainingScreen(repo: Repository, today: Long, questId: String) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val board by remember(today) { repo.board(today) }.collectAsStateWithLifecycle(initialValue = emptyList())
    val quest = board.firstOrNull { it.questId == questId }
    val exercise = remember(questId) { RepService.exerciseFor(questId) }
    val availability = remember { AndroidSensorSource(ctx).availability(exercise) }
    val rep by RepService.state.collectAsStateWithLifecycle()
    val running = rep.running && rep.questId == questId

    DisposableEffect(Unit) {
        (ctx as? Activity)?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { (ctx as? Activity)?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }

    val boss = questId == RepService.BOSS_PUSHUP
    val minute = java.time.LocalTime.now().let { it.hour * 60 + it.minute }
    val windowOpen = quest?.openAt(minute) ?: true
    val target = if (boss) 0 else quest?.target ?: 0
    val progress = if (boss) rep.reps.takeIf { running } ?: 0 else quest?.progress ?: 0
    val sets = remember(target) { if (exercise == Exercise.ROPE) listOf(target) else TrainingProgram.sets(target, if (exercise == Exercise.PUSHUP) 20 else 30) }
    var acc = 0
    val setNo = sets.indexOfFirst { acc += it; progress < acc }.let { if (it < 0) sets.size else it + 1 }

    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        ScreenHeader("TRAINING", if (sets.isEmpty()) "" else "SET ${setNo.coerceAtMost(sets.size)} / ${sets.size}")
        Text(quest?.title ?: "—", style = Txt.title)
        Text(if (boss) "BOSS TEST: วางมือถือใต้หน้าอก วิดรวดเดียวให้มากที่สุด แล้วกด \"จบเซ็ต\" · ผลนี้คือค่า STR" else placement.getValue(exercise), style = Txt.body.copy(color = SysColors.Sub))
        if (!windowOpen) Text("ประตูนี้ยังไม่เปิดหรือปิดไปแล้ว · นับไม่ได้นอกเวลา", style = Txt.body.copy(color = SysColors.CrimsonText))
        Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
            Ring(if (target == 0) 0f else progress / target.toFloat(), if (rep.lastInvalid != null && running) SysColors.Crimson else SysColors.Cyan)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                BigNumber("%02d".format(progress), size = 72)
                Text("/ $target ${quest?.unit ?: ""}", style = Txt.num.copy(color = SysColors.Sub))
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip(if (availability == Availability.OK) "SENSOR OK" else "SENSOR UNSUPPORTED", if (availability == Availability.OK) SysColors.Mint else SysColors.CrimsonText)
            Chip(if (running) "LIVE" else "STANDBY", if (running) SysColors.CrimsonText else SysColors.Sub)
            if (quest?.done == true) Chip("COMPLETE", SysColors.Mint)
        }
        if (questId in com.lifesystem.engine.shadow.Shadow.RACED) {
            var shadow by remember { androidx.compose.runtime.mutableIntStateOf(0) }
            androidx.compose.runtime.LaunchedEffect(progress) { shadow = repo.shadowNow(today, questId) }
            if (shadow > 0) Text(
                "SHADOW · ตัวคุณสัปดาห์ก่อน เวลานี้ทำได้ $shadow" + if (progress > shadow) " · นำอยู่ +${progress - shadow}" else " · ตามอยู่ ${shadow - progress}",
                style = Txt.body.copy(color = if (progress > shadow) SysColors.Mint else SysColors.Hidden),
            )
        }
        rep.lastInvalid?.takeIf { running }?.let { Text("[ INVALID ] ครั้งนี้ไม่นับ · $it", style = Txt.body.copy(color = SysColors.CrimsonText)) }
        if (availability == Availability.UNSUPPORTED) {
            Text("มือถือเครื่องนี้ไม่มีเซนเซอร์ที่ท่านี้ต้องใช้ ระบบนับไม่ได้", style = Txt.body.copy(color = SysColors.CrimsonText))
        } else if (!running) {
            SystemButton("เริ่มนับ", SysColors.Cyan, { RepService.start(ctx, today, questId, exercise) }, enabled = quest != null && quest.done.not() && windowOpen)
        } else {
            SystemButton(if (boss) "จบเซ็ต · บันทึกผล" else "หยุดพัก", SysColors.Cyan, { RepService.stop(ctx) }, primary = false)
        }
        if (!boss) {
            SystemButton("เจ็บ · หยุดทันที", SysColors.Crimson, {
                RepService.stop(ctx)
                scope.launch { repo.reduceRemaining(today, questId) }
            }, primary = false)
            Text("เจ็บแปลบที่ข้อต่อ (ไม่ใช่เมื่อยกล้าม) ให้หยุดทันที ระบบจะลดเป้าที่เหลือของวันนี้ลงครึ่งหนึ่ง · ใช้ได้วันละครั้ง", style = Txt.sub)
        }
    }
}

@Composable
private fun Ring(fraction: Float, color: Color) {
    Canvas(Modifier.size(230.dp)) {
        val w = 14.dp.toPx()
        val inset = w / 2
        drawArc(color.copy(alpha = 0.12f), 0f, 360f, false, Offset(inset, inset), Size(size.width - w, size.height - w), style = Stroke(w))
        drawArc(color, -90f, 360f * fraction.coerceIn(0f, 1f), false, Offset(inset, inset), Size(size.width - w, size.height - w), style = Stroke(w, cap = StrokeCap.Butt))
    }
}
