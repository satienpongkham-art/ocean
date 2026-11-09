package com.lifesystem.app.ui.components

import androidx.compose.foundation.Canvas
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
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifesystem.app.ui.theme.JetBrainsMono
import com.lifesystem.app.ui.theme.Oxanium
import com.lifesystem.app.ui.theme.SysColors
import kotlinx.coroutines.delay
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.temporal.ChronoUnit

/** One line of a quest window: "-วิดพื้น   [37/50]". */
data class GoalRow(
    val id: String,
    val label: String,
    val progress: Int,
    val target: Int,
    val done: Boolean,
    val unit: String = "",
    /** Shown instead of the counter, e.g. "เปิด 14:20". */
    val note: String? = null,
)

/** Countdown (HH:MM:SS) to the end of today, updating every second. */
@Composable
fun rememberCountdownToMidnight(): String {
    var text by remember { mutableStateOf(countdown()) }
    LaunchedEffect(Unit) { while (true) { delay(1000); text = countdown() } }
    return text
}

private fun countdown(): String {
    val now = LocalDateTime.now()
    val s = ChronoUnit.SECONDS.between(now, now.toLocalDate().atTime(LocalTime.MAX)).coerceAtLeast(0)
    return "%02d:%02d:%02d".format(s / 3600, s / 60 % 60, s % 60)
}

private fun shortCount(n: Int): String = if (n >= 10_000) "%.1fk".format(n / 1000.0) else n.toString()

/**
 * The System's quest window (round 1.5): glowing double frame, header tab, avatar slot, GOALS list with
 * counters, CAUTION line and a countdown. Original frame design.
 */
@Composable
fun QuestInfoWindow(
    subtitle: String,
    accent: Color,
    goals: List<GoalRow>,
    modifier: Modifier = Modifier,
    title: String = "QUEST INFO",
    caution: String? = null,
    timer: String? = null,
    avatar: (@Composable () -> Unit)? = null,
    onGoal: (GoalRow) -> Unit = {},
) {
    val mono = TextStyle(fontFamily = JetBrainsMono, fontSize = 13.sp, color = SysColors.Text)
    Box(
        modifier
            .fillMaxWidth()
            .drawBehind {
                // soft outer glow
                for (i in 1..4) {
                    val g = i * 3.dp.toPx()
                    drawRect(accent.copy(alpha = 0.05f), topLeft = Offset(-g, -g), size = Size(size.width + 2 * g, size.height + 2 * g))
                }
            }
            .background(Color(0xF2050B18))
            .border(1.dp, accent.copy(alpha = 0.85f))
            .padding(4.dp)
            .border(1.dp, accent.copy(alpha = 0.3f))
            .drawBehind {
                // corner ornaments
                val l = 14.dp.toPx(); val w = 2.dp.toPx()
                fun corner(x: Float, y: Float, dx: Float, dy: Float) {
                    drawLine(accent, Offset(x, y), Offset(x + dx * l, y), w)
                    drawLine(accent, Offset(x, y), Offset(x, y + dy * l), w)
                    drawCircle(accent, 2.dp.toPx(), Offset(x + dx * 5.dp.toPx(), y + dy * 5.dp.toPx()))
                }
                corner(0f, 0f, 1f, 1f); corner(size.width, 0f, -1f, 1f)
                corner(0f, size.height, 1f, -1f); corner(size.width, size.height, -1f, -1f)
                // top centre crest
                val cx = size.width / 2; val cy = 0f; val r = 7.dp.toPx()
                drawPath(Path().apply { moveTo(cx, cy - r); lineTo(cx + r, cy); lineTo(cx, cy + r); lineTo(cx - r, cy); close() }, accent)
                drawLine(accent.copy(alpha = 0.6f), Offset(cx - 5 * r, cy), Offset(cx - 1.5f * r, cy), w)
                drawLine(accent.copy(alpha = 0.6f), Offset(cx + 1.5f * r, cy), Offset(cx + 5 * r, cy), w)
            }
            .padding(horizontal = 14.dp, vertical = 14.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // header tab
            Row(Modifier.fillMaxWidth().border(1.dp, accent.copy(alpha = 0.45f)).padding(vertical = 6.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(20.dp).border(1.5.dp, accent, androidx.compose.foundation.shape.CircleShape), contentAlignment = Alignment.Center) {
                    Text("!", style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = accent))
                }
                Text("  $title", style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, letterSpacing = 3.sp, color = Color.White))
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (avatar != null) Box(Modifier.padding(end = 2.dp)) { avatar() }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(subtitle, style = Txt.body.copy(color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    Text("GOALS", style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.Bold, fontSize = 13.sp, letterSpacing = 2.sp, color = SysColors.Mint), textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
            Column { goals.forEach { g ->
                val c = if (g.done) SysColors.Mint else SysColors.Text
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 36.dp).clickable(role = Role.Button) { onGoal(g) }.padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(if (g.done) "✓ " else "- ", style = mono.copy(color = c))
                    Text(g.label, style = Txt.body.copy(color = if (g.done) SysColors.Muted else Color.White, fontSize = 14.sp), modifier = Modifier.weight(1f))
                    Text(
                        g.note ?: if (g.target > 1) "[${shortCount(g.progress)}/${shortCount(g.target)}]" else if (g.done) "[1/1]" else "[0/1]",
                        style = mono.copy(color = if (g.note != null) SysColors.Emergency else c),
                    )
                }
            } }
            if (caution != null) {
                Text(
                    buildCaution(caution),
                    style = Txt.sub.copy(color = SysColors.Text, fontSize = 12.sp),
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                )
            }
            if (timer != null) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Canvas(Modifier.size(22.dp)) {
                        val st = 2.dp.toPx()
                        drawCircle(accent, size.minDimension / 2 - st, style = Stroke(st))
                        drawLine(accent, center, Offset(center.x, center.y - size.height * 0.3f), st)
                        drawLine(accent, center, Offset(center.x + size.width * 0.22f, center.y), st)
                    }
                    Text("  $timer", style = mono.copy(color = accent, fontSize = 15.sp, fontWeight = FontWeight.Bold))
                }
            }
        }
    }
}

private fun buildCaution(text: String) = androidx.compose.ui.text.buildAnnotatedString {
    pushStyle(androidx.compose.ui.text.SpanStyle(color = SysColors.Crimson, fontWeight = FontWeight.Bold))
    append("CAUTION! ")
    pop()
    append(text)
}
