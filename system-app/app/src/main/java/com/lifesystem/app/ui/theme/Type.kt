package com.lifesystem.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.lifesystem.app.R

@OptIn(ExperimentalTextApi::class)
private fun variable(res: Int, vararg weights: Int) = FontFamily(
    weights.map { w -> Font(res, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w))) },
)

/** Numbers and English system headers (bundled, OFL). */
val Oxanium = variable(R.font.oxanium, 400, 600, 700, 800)

/** Thai body text (bundled, OFL). */
val ChakraPetch = FontFamily(
    Font(R.font.chakra_petch_regular, FontWeight.Normal),
    Font(R.font.chakra_petch_medium, FontWeight.Medium),
    Font(R.font.chakra_petch_semibold, FontWeight.SemiBold),
    Font(R.font.chakra_petch_bold, FontWeight.Bold),
)

/** System code labels (bundled, OFL). */
val JetBrainsMono = variable(R.font.jetbrains_mono, 400, 600)

val SysTypography = Typography(
    bodyLarge = TextStyle(fontFamily = ChakraPetch, fontSize = 16.sp),
    bodyMedium = TextStyle(fontFamily = ChakraPetch, fontSize = 14.sp),
    bodySmall = TextStyle(fontFamily = ChakraPetch, fontSize = 12.sp),
    titleLarge = TextStyle(fontFamily = ChakraPetch, fontWeight = FontWeight.Bold, fontSize = 24.sp),
    titleMedium = TextStyle(fontFamily = ChakraPetch, fontWeight = FontWeight.SemiBold, fontSize = 17.sp),
    labelLarge = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.Bold, fontSize = 14.sp, letterSpacing = 2.sp),
    labelMedium = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.sp),
    labelSmall = TextStyle(fontFamily = JetBrainsMono, fontSize = 11.sp),
)
