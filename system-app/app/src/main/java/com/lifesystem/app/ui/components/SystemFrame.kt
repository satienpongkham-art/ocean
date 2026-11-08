package com.lifesystem.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifesystem.app.ui.theme.Oxanium
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.app.ui.theme.rememberReducedMotion

/** Full-screen System background: void + faint grid + slow scan line. */
@Composable
fun SystemBackground(accent: Color = SysColors.Cyan, content: @Composable () -> Unit) {
    val reduced = rememberReducedMotion()
    val scan by rememberInfiniteTransition(label = "scan").animateFloat(
        0f, 1f, infiniteRepeatable(tween(6000, easing = LinearEasing)), label = "scanY",
    )
    Box(
        Modifier.fillMaxSize().background(SysColors.Void).drawBehind {
            val step = 24.dp.toPx()
            val grid = accent.copy(alpha = 0.05f)
            var x = 0f
            while (x < size.width) { drawLine(grid, Offset(x, 0f), Offset(x, size.height), 1f); x += step }
            var y = 0f
            while (y < size.height) { drawLine(grid, Offset(0f, y), Offset(size.width, y), 1f); y += step }
            if (!reduced) {
                val sy = scan * size.height
                drawRect(accent.copy(alpha = 0.05f), topLeft = Offset(0f, sy - 45.dp.toPx()), size = androidx.compose.ui.geometry.Size(size.width, 90.dp.toPx()))
            }
        },
    ) { content() }
}

/** Panel with corner brackets and an inner hairline (spec §15.1). */
@Composable
fun SystemFrame(
    modifier: Modifier = Modifier,
    accent: Color = SysColors.Cyan,
    background: Color = SysColors.Panel,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(
        modifier
            .background(background)
            .border(1.dp, accent.copy(alpha = 0.5f))
            .drawBehind {
                val l = 18.dp.toPx(); val w = 3.dp.toPx()
                val c = accent
                fun corner(x: Float, y: Float, dx: Float, dy: Float) {
                    drawLine(c, Offset(x, y), Offset(x + dx * l, y), w)
                    drawLine(c, Offset(x, y), Offset(x, y + dy * l), w)
                }
                corner(0f, 0f, 1f, 1f); corner(size.width, 0f, -1f, 1f)
                corner(0f, size.height, 1f, -1f); corner(size.width, size.height, -1f, -1f)
            },
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp), content = content)
    }
}

/** "◇ SYSTEM ◇" header with lines. */
@Composable
fun SystemHeader(text: String = "SYSTEM", accent: Color = SysColors.Cyan) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.width(24.dp).height(1.dp).background(accent))
        Diamond(accent, Modifier.padding(horizontal = 8.dp))
        Text(text, style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, letterSpacing = 6.sp, color = accent.copy(alpha = 0.95f)))
        Diamond(accent, Modifier.padding(horizontal = 8.dp))
        Box(Modifier.width(24.dp).height(1.dp).background(accent))
    }
}

@Composable
fun Diamond(color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier.size(14.dp)) {
        val p = Path().apply { moveTo(size.width / 2, 0f); lineTo(size.width, size.height / 2); lineTo(size.width / 2, size.height); lineTo(0f, size.height / 2); close() }
        drawPath(p, color, style = Stroke(1.5.dp.toPx()))
        val q = Path().apply {
            val c = size.width / 2; val r = size.width / 4
            moveTo(c, c - r); lineTo(c + r, c); lineTo(c, c + r); lineTo(c - r, c); close()
        }
        drawPath(q, color)
    }
}

/** "[ DAILY QUEST ]" style tag. */
@Composable
fun SystemTag(text: String, color: Color) {
    Text("[ $text ]", style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.Bold, fontSize = 13.sp, letterSpacing = 3.sp, color = color))
}

/** Crimson full-screen flash overlay, ≤ 1 flash per 1.2 s (WCAG 2.3.1 safe). */
@Composable
fun CrimsonFlash(modifier: Modifier = Modifier) {
    if (rememberReducedMotion()) return
    val a by rememberInfiniteTransition(label = "flash").animateFloat(
        0f, 0.45f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "flashA",
    )
    Box(modifier.fillMaxSize().graphicsLayer { alpha = a }.drawBehind {
        drawRect(androidx.compose.ui.graphics.Brush.radialGradient(listOf(Color.Transparent, SysColors.Crimson), radius = size.maxDimension * 0.75f))
    })
}

@Composable
fun BigNumber(text: String, color: Color = Color.White, size: Int = 30) {
    Text(text, textAlign = TextAlign.Center, style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.ExtraBold, fontSize = size.sp, color = color))
}
