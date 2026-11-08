package com.lifesystem.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.app.ui.theme.rememberReducedMotion

/**
 * Slanted, segmented HUD gauge (spec §15.1): dark hatched track, gradient fill with glowing tip,
 * moving shine, optional damage trail.
 */
@Composable
fun HudBar(
    fraction: Float,
    color: Color,
    modifier: Modifier = Modifier,
    segments: Int = 10,
    trail: Float? = null,
    height: Dp = 12.dp,
) {
    val reduced = rememberReducedMotion()
    val f by animateFloatAsState(fraction.coerceIn(0f, 1f), tween(if (reduced) 0 else 450), label = "fill")
    val t by animateFloatAsState((trail ?: fraction).coerceIn(0f, 1f), tween(if (reduced) 0 else 1200, delayMillis = 500), label = "trail")
    val shine by rememberInfiniteTransition(label = "shine").animateFloat(
        -0.2f, 1.2f, infiniteRepeatable(tween(2600, easing = LinearEasing)), label = "shineX",
    )
    Canvas(modifier.fillMaxWidth().height(height)) {
        val slant = size.height * 0.6f
        val shape = Path().apply {
            moveTo(slant, 0f); lineTo(size.width, 0f); lineTo(size.width - slant, size.height); lineTo(0f, size.height); close()
        }
        clipPath(shape) {
            drawRect(Color(0xFF050B16))
            if (t > f) drawRect(Color.White.copy(alpha = 0.25f), size = Size(size.width * t, size.height))
            val w = size.width * f
            if (w > 0f) {
                drawRect(Brush.horizontalGradient(listOf(color.copy(alpha = 0.55f), color, Color.White.copy(alpha = 0.9f).compositeOver(color)), 0f, w.coerceAtLeast(1f)), size = Size(w, size.height))
                drawRect(Color.White.copy(alpha = 0.22f), size = Size(w, size.height * 0.4f))
                if (!reduced) {
                    val sx = shine * size.width
                    if (sx < w) drawRect(Brush.horizontalGradient(listOf(Color.Transparent, Color.White.copy(alpha = 0.45f), Color.Transparent), sx - 30f, sx + 30f),
                        topLeft = Offset(sx - 30f, 0f), size = Size(60f, size.height))
                }
                drawRect(Color.White, topLeft = Offset(w - 2.dp.toPx(), 0f), size = Size(2.dp.toPx(), size.height))
            }
            val seg = size.width / segments
            for (i in 1 until segments) drawRect(SysColors.Void, topLeft = Offset(seg * i - 1.dp.toPx(), 0f), size = Size(2.dp.toPx(), size.height))
        }
        drawPath(shape, color.copy(alpha = 0.6f), style = androidx.compose.ui.graphics.drawscope.Stroke(1.dp.toPx()))
    }
}

private fun Color.compositeOver(bg: Color): Color {
    val a = alpha
    return Color(red * a + bg.red * (1 - a), green * a + bg.green * (1 - a), blue * a + bg.blue * (1 - a), 1f)
}
