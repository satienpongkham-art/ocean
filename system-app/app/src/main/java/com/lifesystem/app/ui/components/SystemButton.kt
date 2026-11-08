package com.lifesystem.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifesystem.app.ui.theme.ChakraPetch

/** Game-style button; ≥ 52 dp tall (primary) / 44 dp (secondary). */
@Composable
fun SystemButton(
    text: String,
    accent: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    primary: Boolean = true,
    enabled: Boolean = true,
) {
    val bg = if (primary) accent.copy(alpha = 0.16f) else Color.Transparent
    Box(
        modifier
            .fillMaxWidth()
            .heightIn(min = if (primary) 52.dp else 44.dp)
            .background(bg)
            .border(1.dp, accent.copy(alpha = if (enabled) 0.8f else 0.3f))
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            style = TextStyle(
                fontFamily = ChakraPetch, fontWeight = FontWeight.Bold, fontSize = if (primary) 17.sp else 14.sp,
                letterSpacing = 1.sp, color = if (enabled) Color.White else Color.White.copy(alpha = 0.4f),
            ),
        )
    }
}
