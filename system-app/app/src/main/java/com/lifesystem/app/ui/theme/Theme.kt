package com.lifesystem.app.ui.theme

import android.provider.Settings
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import com.lifesystem.engine.model.Stat

object SysColors {
    val Void = Color(0xFF03050A)
    val Panel = Color(0xF0060E1E)
    val Cyan = Color(0xFF4FD8FF)
    val CyanHi = Color(0xFFBFF3FF)
    val Blue = Color(0xFF2E7BFF)
    val Crimson = Color(0xFFFF2E4D)
    val CrimsonText = Color(0xFFFF6B7F)
    val Emergency = Color(0xFFFFB547)
    val Hidden = Color(0xFFB49CFF)
    val Gold = Color(0xFFFFC857)
    val Mint = Color(0xFF5CFFC1)
    val Text = Color(0xFFE8F6FF)
    val Sub = Color(0xFF9EC3DA)
    val Muted = Color(0xFF6F8CA3)

    fun stat(s: Stat): Color = when (s) {
        Stat.STR -> Color(0xFFFF8F6B)
        Stat.VIT -> Color(0xFF5CFFC1)
        Stat.AGI -> Color(0xFFFFE066)
        Stat.CHA -> Color(0xFFFF9AD5)
        Stat.MND -> Color(0xFFB49CFF)
        Stat.INT -> Color(0xFF6BB6FF)
        Stat.GOLD -> Gold
    }
}

@Composable
fun SystemTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            background = SysColors.Void, surface = SysColors.Panel, primary = SysColors.Cyan,
            onPrimary = SysColors.Void, onBackground = SysColors.Text, onSurface = SysColors.Text, error = SysColors.Crimson,
        ),
        typography = SysTypography,
        content = content,
    )
}

/** True when the user turned animations off in system settings. */
@Composable
fun rememberReducedMotion(): Boolean {
    val ctx = LocalContext.current
    return remember {
        Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
}
