package com.lifesystem.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifesystem.app.ui.theme.ChakraPetch
import com.lifesystem.app.ui.theme.JetBrainsMono
import com.lifesystem.app.ui.theme.Oxanium
import com.lifesystem.app.ui.theme.SysColors

object Txt {
    val body = TextStyle(fontFamily = ChakraPetch, fontSize = 15.sp, color = SysColors.Text)
    val sub = TextStyle(fontFamily = ChakraPetch, fontSize = 12.sp, color = SysColors.Sub)
    val title = TextStyle(fontFamily = ChakraPetch, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
    val sys = TextStyle(fontFamily = Oxanium, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp, color = SysColors.Cyan)
    val num = TextStyle(fontFamily = Oxanium, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
    val code = TextStyle(fontFamily = JetBrainsMono, fontSize = 11.sp, color = SysColors.Muted)
}

/** Screen title row: glowing English header + optional right text. */
@Composable
fun ScreenHeader(title: String, right: String = "") {
    Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
        Text(title, style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, letterSpacing = 6.sp, color = SysColors.CyanHi))
        Text(right, style = Txt.code)
    }
}

@Composable
fun Chip(text: String, color: Color) {
    Box(Modifier.border(1.dp, color).padding(horizontal = 6.dp, vertical = 2.dp)) {
        Text(text, style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.Bold, fontSize = 10.sp, letterSpacing = 1.sp, color = color))
    }
}

/** Selectable chip, ≥ 44 dp tall, wraps its text. */
@Composable
fun ChoiceChip(text: String, selected: Boolean, color: Color, onClick: () -> Unit) {
    Box(
        Modifier.heightIn(min = 44.dp)
            .background(if (selected) color.copy(alpha = 0.18f) else Color.Transparent)
            .border(1.dp, if (selected) color else color.copy(alpha = 0.35f))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = Txt.body.copy(color = if (selected) Color.White else SysColors.Sub)) }
}

@Composable
fun SysField(label: String, value: String, onChange: (String) -> Unit, number: Boolean = false, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value, onValueChange = onChange, label = { Text(label, style = Txt.sub) }, singleLine = true,
        textStyle = Txt.body, modifier = modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = if (number) KeyboardType.Decimal else KeyboardType.Text),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = SysColors.Cyan, unfocusedBorderColor = SysColors.Cyan.copy(alpha = 0.35f),
            focusedTextColor = Color.White, unfocusedTextColor = Color.White, cursorColor = SysColors.Cyan,
        ),
    )
}

@Composable
fun LabeledBar(label: String, value: String, fraction: Float, color: Color) {
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = Txt.sys.copy(color = color))
            Text(value, style = Txt.num.copy(fontSize = 13.sp))
        }
        HudBar(fraction, color, Modifier.padding(top = 4.dp))
    }
}

@Composable
fun PanelBox(modifier: Modifier = Modifier, color: Color = SysColors.Cyan, content: @Composable () -> Unit) {
    Box(modifier.background(SysColors.Panel).border(1.dp, color.copy(alpha = 0.3f)).padding(10.dp)) { content() }
}
