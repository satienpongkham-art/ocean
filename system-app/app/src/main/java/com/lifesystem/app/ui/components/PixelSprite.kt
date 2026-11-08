package com.lifesystem.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Draws a [Sprite] with square pixels of [pixel] size. */
@Composable
fun PixelSprite(sprite: Sprite, pixel: Dp = 5.dp, modifier: Modifier = Modifier) {
    Canvas(modifier.size(pixel * sprite.width, pixel * sprite.height)) {
        val p = pixel.toPx()
        sprite.grid.forEachIndexed { y, row ->
            row.forEachIndexed { x, ch ->
                val argb = sprite.palette[ch] ?: return@forEachIndexed
                drawRect(Color(argb), topLeft = Offset(x * p, y * p), size = Size(p + 0.5f, p + 0.5f))
            }
        }
    }
}
