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

    /** Shirt width per torso row (8 rows, even numbers so it stays centred): round belly (1) → V-shape (5). */
    private val torso = listOf(
        listOf(12, 14, 14, 14, 14, 14, 12, 12),
        listOf(12, 12, 12, 12, 12, 12, 12, 10),
        listOf(12, 12, 12, 10, 10, 10, 10, 10),
        listOf(14, 14, 12, 12, 10, 10, 10, 10),
        listOf(16, 14, 12, 12, 10, 10, 8, 8),
    )

    private const val W = 20

    private fun row(cells: CharArray) = String(cells)

    fun body(stage: Int, outfitId: String? = null): Sprite {
        val s = stage.coerceIn(1, 5)
        val o = outfitId?.let { outfits[it] } ?: defaultOutfit
        val head = listOf(
            "....HHHHHHH.....", "...HHHHHHHHH....", "..HHHHHHHHHHH...", "..HHSSSSSSSHH...",
            "..HSSSSSSSSSH...", "..SSSESSSESSS...", "..SSSSSSSSSSS...",
            if (s <= 2) "..DSSSSMSSSSD..." else "...SSSSMSSSS....",
            if (s <= 2) "...DSSSSSSSD...." else "....SSSSSSS.....",
            "....DDSSSDD.....",
        ).map { "..$it.." } // 16 → 20 wide, centred
        val widths = torso[s - 1]
        val widest = widths.take(6).max()
        val armL = (W - widest) / 2 - 2 // 2-px arms hang straight beside the widest part
        val armR = (W + widest) / 2
        val torsoRows = widths.mapIndexed { i, w ->
            val cells = CharArray(W) { '.' }
            val left = (W - w) / 2
            for (x in 0 until w) {
                val edge = x == 0 || x == w - 1
                cells[left + x] = if (edge || i >= 6) 'w' else 'W'
            }
            if (i <= 6) {
                val c = if (i <= 1) 'W' else 'S' // short sleeves on top
                for (a in 0..1) { cells[armL + a] = c; cells[armR + a] = c }
                if (i <= 1) { cells[armL] = 'w'; cells[armR + 1] = 'w' }
            }
            row(cells)
        }
        val waist = widths.last()
        val leg = (waist - 3) / 2 // two legs with a gap between them
        val legs = List(4) {
            val cells = CharArray(W) { '.' }
            val left = (W - waist) / 2 + 1
            for (x in 0 until leg) { cells[left + x] = 'P'; cells[left + leg + 0 + x + (waist - 2 - 2 * leg)] = 'P' }
            if (o.longCoat && it < 2) { cells[left - 1] = 'w'; cells[left + waist - 2] = 'w' }
            row(cells)
        }
        val feet = legs.last().replace('P', 'F').replace('w', '.')
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
                drawOval(Brush.radialGradient(listOf(aura.copy(alpha = 0.85f), aura.copy(alpha = 0.35f), Color.Transparent)))
            }
        }
        Row(verticalAlignment = Alignment.Bottom) {
            PixelSprite(body, pixel)
            weapon?.let { AvatarArt.weapons[it] }?.let { PixelSprite(it, pixel, Modifier.padding(bottom = pixel * 6)) }
            prop?.let { AvatarArt.props[it] }?.let { PixelSprite(it, pixel * 0.8f, Modifier.padding(start = pixel, bottom = pixel * 2)) }
        }
    }
}
