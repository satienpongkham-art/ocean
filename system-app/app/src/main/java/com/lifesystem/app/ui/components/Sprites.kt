package com.lifesystem.app.ui.components

/** Pixel-art sprite: rows of chars; '.' is transparent, other chars map to ARGB colors. */
data class Sprite(val grid: List<String>, val palette: Map<Char, Long>) {
    val width: Int get() = grid.first().length
    val height: Int get() = grid.size
}

object Sprites {
    private val skin = mapOf('S' to 0xFFE0A27A, 'D' to 0xFFB97A55, 'H' to 0xFF141018, 'E' to 0xFF141018, 'M' to 0xFF7A3B2B)

    /** Stage-1 body (heavier build); later stages arrive with VIT/STR rank changes. */
    val avatarStage1 = Sprite(
        listOf(
            "....HHHHHHH.....", "...HHHHHHHHH....", "..HHHHHHHHHHH...", "..HHSSSSSSSHH...",
            "..HSSSSSSSSSH...", "..SSSESSSESSS...", "..SSSSSSSSSSS...", "..DSSSSMSSSSD...",
            "...DSSSSSSSD....", "....DDSSSDD.....", "..WWWWWWWWWWW...", ".WWWWWWWWWWWWW..",
            ".SWWWWWWWWWWWS..", ".SWWWWWWWWWWWS..", ".SwWWWWWWWWWwS..", "..wwWWWWWWWww...",
            "..wwwwwwwwwww...", "...PPPPPPPPP....", "...PPPP.PPPP....", "...PPPP.PPPP....",
            "...FFFF.FFFF....", "................",
        ),
        skin + mapOf('W' to 0xFF2F5D86, 'w' to 0xFF1F3E5C, 'P' to 0xFF26262E, 'F' to 0xFF43434F),
    )

    val kapao = Sprite(
        listOf(
            "....................", ".......gG...........", ".....BBbGBB..RRRR...", "....BBGBBCBbRRRRRR..",
            "...BbBBBGBBRRRrRRRR.", "..WWWBCBbBBRRRRRrRR.", ".WYYWBBBBBRRRRRRRRR.", ".WYYWOOOOOOOOOOOOOO.",
            "OOWWOOOOOOOOOOOOOOOO", ".oOOOOOOOOOOOOOOOOo.", "..oooooooooooooooo..",
        ),
        mapOf('O' to 0xFFE6EDF4, 'o' to 0xFF93A3B4, 'R' to 0xFFF7F4EA, 'r' to 0xFFD6CFBD, 'B' to 0xFF8A4B2A, 'b' to 0xFF5E3019,
            'G' to 0xFF3FA34D, 'g' to 0xFF2A7A37, 'W' to 0xFFFFFFFF, 'Y' to 0xFFFFC23D, 'C' to 0xFFE53935),
    )

    val tomyum = Sprite(
        listOf(
            "......V....V........", ".......V....V.......", "......V....V........", "..OOOOOOOOOOOOOOOO..",
            ".OSSSWSSGSSCSSWSSSO.", ".OSsSSSWSSSSGSSsSSO.", "..OSSSSSSCSSSWSSSO..", "...OOOOOOOOOOOOOO...",
            ".....oooooooooo.....", "......oooooooo......", "....................",
        ),
        mapOf('V' to 0xFF9FB3C4, 'O' to 0xFFEEF3F8, 'o' to 0xFF93A3B4, 'S' to 0xFFE8642A, 's' to 0xFFB8431A,
            'W' to 0xFFF3E7D2, 'G' to 0xFF3FA34D, 'C' to 0xFFE53935),
    )

    val bfast = Sprite(
        listOf(
            "....................", "....MMM.............", "...MMMMM............", "...MBBBM............",
            "...MBBBM....WWW.....", "...MMMMM...WWWWW....", "...MMMMM..WWYYYWW...", "...MMMMM..WWYYYWW...",
            "...MMMMMPPPPPPPPP...", "...MMMMMPPpPPPpPP...", "........PPPPPPPPP...",
        ),
        mapOf('M' to 0xFFF4F7FB, 'B' to 0xFF3B82F6, 'W' to 0xFFFFFFFF, 'Y' to 0xFFFFC23D, 'P' to 0xFFE9B98A, 'p' to 0xFFC98D5A),
    )

    val snack = Sprite(
        listOf(
            "....................", "......LLLLLL........", ".....LLLLLLLL.......", ".....KKKKKKKK..YY...",
            ".....KkkkkkkK.YYY...", ".....KKKKKKKKYYY....", "......KKKKKKYYY.....", "......KKKKKKYY......",
            ".......KKKKY........", "....................", "....................",
        ),
        mapOf('L' to 0xFFB49CFF, 'K' to 0xFFF4F7FB, 'k' to 0xFFD9C9FF, 'Y' to 0xFFFFD84A),
    )

    val food: Map<String, Sprite> = mapOf("kapao" to kapao, "tomyum" to tomyum, "bfast" to bfast, "snack" to snack)

    val all: Map<String, Sprite> = food + ("avatarStage1" to avatarStage1)
}
