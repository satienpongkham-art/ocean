package com.lifesystem.app.ui.log

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.components.ChoiceChip
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import kotlinx.coroutines.launch

/** Journal quest rule: at least three non-blank lines (spec §11). */
fun journalComplete(text: String): Boolean = text.lines().count { it.isNotBlank() } >= 3

private val emotions = listOf("ภูมิใจ", "สงบ", "มีพลัง", "เหนื่อย", "เครียด", "หงุดหงิด", "เบื่อ", "กังวล", "เศร้า", "ใจร้อน")

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun JournalScreen(repo: Repository, today: Long) {
    val scope = rememberCoroutineScope()
    var text by remember { mutableStateOf("") }
    var emotion by remember { mutableStateOf("") }
    var saved by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { repo.journal(today)?.let { text = it.text; emotion = it.emotion } }
    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ScreenHeader("JOURNAL", "MND")
        Text("3 บรรทัด: 1) วันนี้เกิดอะไรขึ้น 2) รู้สึกอะไร 3) พรุ่งนี้จะทำอะไร", style = Txt.sub)
        OutlinedTextField(
            value = text, onValueChange = { text = it; saved = false }, minLines = 6, textStyle = Txt.body,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = SysColors.Hidden, unfocusedBorderColor = SysColors.Hidden.copy(alpha = 0.4f), focusedTextColor = Color.White, unfocusedTextColor = Color.White),
        )
        Text("ตั้งชื่ออารมณ์ (Affect labeling)", style = Txt.sys.copy(color = SysColors.Hidden))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            emotions.forEach { e ->
                ChoiceChip(e, e == emotion, SysColors.Hidden) { emotion = e; saved = false }
            }
        }
        SystemButton(if (saved) "บันทึกแล้ว" else "บันทึก", SysColors.Hidden, {
            scope.launch {
                repo.saveJournal(today, text, emotion)
                if (journalComplete(text)) repo.complete(today, "journal")
                saved = true
            }
        })
        if (!journalComplete(text)) Text("ยังไม่ครบ 3 บรรทัด · เควสต์ไดอารี่ยังไม่สำเร็จ", style = Txt.sub.copy(color = SysColors.CrimsonText))
    }
}
