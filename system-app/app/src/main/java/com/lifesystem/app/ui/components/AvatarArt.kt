package com.lifesystem.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** The player's own pixel avatar: body changes with the real-progress stage (1–5); cosmetics draw over it. */
object AvatarArt {
    private val skin = mapOf('S' to 0xFFE0A27A, 'D' to 0xFFB97A55, 'H' to 0xFF141018, 'E' to 0xFF141018, 'M' to 0xFF7A3B2B, 'F' to 0xFF43434F)

    data class Outfit(val shirt: Long, val shade: Long, val pants: Long, val longCoat: Boolean = false)

    private val defaultOutfit = Outfit(0xFF2F5D86, 0xFF1F3E5C, 0xFF26262E)

    val outfits: Map<String, Outfit> = mapOf(
        "outfit_hoodie" to Outfit(0xFF2B2D33, 0xFF1A1B1F, 0xFF26262E),
        "outfit_jacket" to Outfit(0xFF6B3E26, 0xFF4A2A18, 0xFF1E2230),
        "outfit_coat" to Outfit(0xFF1E2A4A, 0xFF121A30, 0xFF15151B, longCoat = true),
        "job_warrior" to Outfit(0xFF7A1F2B, 0xFF4E121B, 0xFF2A2A30),
        "job_guardian" to Outfit(0xFF2F7A5E, 0xFF1E4F3D, 0xFF22262A),
        "job_hunter" to Outfit(0xFF5E5A2A, 0xFF3E3B1B, 0xFF24221A),
        "job_beacon" to Outfit(0xFFE8E4F0, 0xFFB9B2CC, 0xFF3A3550),
        "job_monk" to Outfit(0xFF4B3A78, 0xFF30244F, 0xFF221A38),
        "job_sage" to Outfit(0xFF22406E, 0xFF152A49, 0xFF141E33, longCoat = true),
    )

    /** Shirt width per torso row (8 rows), from round belly (stage 1) to V-shape (stage 5). */
    private val torso = listOf(
        listOf(11, 13, 13, 13, 13, 13, 11, 11),
        listOf(12, 12, 12, 12, 12, 11, 11, 10),
        listOf(12, 12, 11, 11, 10, 10, 10, 9),
        listOf(13, 13, 12, 11, 10, 9, 9, 9),
        listOf(14, 14, 12, 11, 10, 9, 8, 8),
    )

    private const val W = 16

    private fun centered(content: String): String {
        val left = (W - content.length) / 2
        return ".".repeat(left) + content + ".".repeat(W - left - content.length)
    }

    fun body(stage: Int, outfitId: String? = null): Sprite {
        val s = stage.coerceIn(1, 5)
        val o = outfitId?.let { outfits[it] } ?: defaultOutfit
        val cheek = if (s <= 2) 'D' else 'S'
        val head = listOf(
            "....HHHHHHH.....", "...HHHHHHHHH....", "..HHHHHHHHHHH...", "..HHSSSSSSSHH...",
            "..HSSSSSSSSSH...", "..SSSESSSESSS...", "..SSSSSSSSSSS...",
            if (s <= 2) "..${cheek}SSSSMSSSS$cheek..." else "...SSSSMSSSS....",
            if (s <= 2) "...DSSSSSSSD...." else "....SSSSSSS.....",
            "....DDSSSDD.....",
        ).map { it.substring(0, W) }
        val widths = torso[s - 1]
        val torsoRows = widths.mapIndexed { i, w ->
            val shirt = buildString {
                repeat(w) { x -> append(if (x == 0 || x == w - 1 || i >= 6 || (s >= 4 && i == 2 && x == w / 2)) 'w' else 'W') }
            }
            centered(if (i in 1..5) "S$shirt" + "S" else shirt)
        }
        val waist = widths.last()
        val leg = (waist - 1) / 2
        val legRow = "P".repeat(leg) + "." + "P".repeat(leg)
        val legs = List(4) { centered(if (o.longCoat && it < 2) "w$legRow" + "w" else legRow) }
        val feet = centered("F".repeat(leg) + "." + "F".repeat(leg))
        return Sprite(head + torsoRows + legs + feet, skin + mapOf('W' to o.shirt, 'w' to o.shade, 'P' to o.pants))
    }

    val weapons: Map<String, Sprite> = mapOf(
        "weapon_dagger" to Sprite(
            listOf("..L..", "..L..", ".LLL.", "..L..", "..L..", "GGGGG", "..B..", "..B.."),
            mapOf('L' to 0xFFDCE6F0, 'G' to 0xFF9AA7B4, 'B' to 0xFF4A2E1E),
        ),
        "weapon_sword" to Sprite(
            listOf("..L..", ".LLL.", ".LlL.", ".LlL.", ".LlL.", ".LlL.", ".LlL.", ".LlL.", ".LlL.", "GGGGG", "..B..", "..B..", "..G.."),
            mapOf('L' to 0xFFE8F6FF, 'l' to 0xFF8FD8FF, 'G' to 0xFFFFC857, 'B' to 0xFF3A2416),
        ),
        "weapon_staff" to Sprite(
            listOf(".PPP.", "PpPpP", ".PPP.", "..B..", "..B..", "..B..", "..B..", "..B..", "..B..", "..B..", "..B..", "..B.."),
            mapOf('P' to 0xFFB49CFF, 'p' to 0xFFFFFFFF, 'B' to 0xFF7A5230),
        ),
    )

    val auras: Map<String, Color> = mapOf(
        "aura_cyan" to Color(0xFF4FD8FF),
        "aura_violet" to Color(0xFFB49CFF),
        "aura_gold" to Color(0xFFFFC857),
        "aura_gate" to Color(0xFF5CFFC1),
    )

    /** Small item that shows which part of life a quest window is about. */
    val props: Map<String, Sprite> = mapOf(
        "STR" to Sprite(listOf("BB....BB", "BB....BB", "BBGGGGBB", "BB....BB", "BB....BB"), mapOf('B' to 0xFF3A3F4A, 'G' to 0xFF9AA7B4)),
        "VIT" to Sprite(listOf("...B....", "..BBB...", ".BBlBB..", ".BBBBB..", "..BBB..."), mapOf('B' to 0xFF3FB6FF, 'l' to 0xFFE8F6FF)),
        "AGI" to Sprite(listOf("....YY..", "...YY...", "..YYYY..", "...YY...", "..YY...."), mapOf('Y' to 0xFFFFE066)),
        "CHA" to Sprite(listOf("...P....", ".P.P.P..", "..PPP...", ".P.P.P..", "...P...."), mapOf('P' to 0xFFFF9AD5)),
        "MND" to Sprite(listOf("..VVV...", ".VV.....", ".VV.....", ".VV.....", "..VVV..."), mapOf('V' to 0xFFB49CFF)),
        "INT" to Sprite(listOf(".BBBBBB.", ".BwwBwB.", ".BwwBwB.", ".BwwBwB.", ".BBBBBB."), mapOf('B' to 0xFF6BB6FF, 'w' to 0xFFF4F7FB)),
        "GOLD" to Sprite(listOf("..GGGG..", ".GGyyGG.", ".GyGGyG.", ".GGyyGG.", "..GGGG.."), mapOf('G' to 0xFFFFC857, 'y' to 0xFFFFF1B8)),
        "PENALTY" to Sprite(listOf(".RR..RR.", "..RRRR..", "...RR...", "..RRRR..", ".RR..RR."), mapOf('R' to 0xFFFF2E4D)),
    )
}

/** Avatar with optional aura glow, weapon and category prop. */
@Composable
fun AvatarView(
    stage: Int,
    pixel: Dp = 5.dp,
    outfit: String? = null,
    weapon: String? = null,
    aura: Color? = null,
    prop: String? = null,
    modifier: Modifier = Modifier,
) {
    val body = AvatarArt.body(stage, outfit)
    Box(modifier, contentAlignment = Alignment.Center) {
        if (aura != null) {
            Canvas(Modifier.size(pixel * (body.width + 8), pixel * (body.height + 4))) {
                drawOval(Brush.radialGradient(listOf(aura.copy(alpha = 0.55f), aura.copy(alpha = 0.12f), Color.Transparent)))
            }
        }
        Row(verticalAlignment = Alignment.Bottom) {
            PixelSprite(body, pixel)
            weapon?.let { AvatarArt.weapons[it] }?.let { PixelSprite(it, pixel, Modifier.padding(bottom = pixel * 6)) }
            prop?.let { AvatarArt.props[it] }?.let { PixelSprite(it, pixel * 0.8f, Modifier.padding(start = pixel, bottom = pixel * 2)) }
        }
    }
}
