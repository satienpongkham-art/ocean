package com.lifesystem.app.popup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.ui.components.BigNumber
import com.lifesystem.app.ui.components.CrimsonFlash
import com.lifesystem.app.ui.components.PixelSprite
import com.lifesystem.app.ui.components.Sprites
import com.lifesystem.app.ui.components.SystemBackground
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.SystemFrame
import com.lifesystem.app.ui.components.SystemHeader
import com.lifesystem.app.ui.components.SystemTag
import com.lifesystem.app.ui.theme.ChakraPetch
import com.lifesystem.app.ui.theme.Oxanium
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.model.MenuItem
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Stat

private val body = TextStyle(fontFamily = ChakraPetch, fontSize = 15.sp, color = SysColors.Text)
private val sub = TextStyle(fontFamily = ChakraPetch, fontSize = 13.sp, color = SysColors.Sub)

@Composable
private fun PopupShell(accent: Color, flash: Boolean = false, content: @Composable () -> Unit) {
    SystemBackground(accent) {
        Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Column(Modifier.verticalScroll(rememberScrollState())) { content() }
        }
        if (flash) CrimsonFlash()
    }
}

/** 07:00 popup. Hard mode: there is no decline button. */
@Composable
fun DailyQuestPopup(quests: List<QuestEntity>, timeLeft: String, onAccept: () -> Unit) {
    val penalty = quests.any { it.type == QuestType.PENALTY.name }
    val accent = if (penalty) SysColors.Crimson else SysColors.Cyan
    PopupShell(accent, flash = penalty) {
        SystemFrame(accent = accent) {
            SystemHeader(accent = accent)
            SystemTag(if (penalty) "PENALTY QUEST" else "DAILY QUEST", if (penalty) SysColors.CrimsonText else SysColors.Cyan)
            Text(if (penalty) "เควสต์ล้มเหลว" else "เควสต์ประจำวัน", style = body.copy(fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White))
            Text(
                if (penalty) "เมื่อวานผู้เล่นทำเควสต์หลักไม่ครบ ระบบส่งผู้เล่นเข้าสู่เควสต์ลงโทษ" else "ผู้เล่นได้รับเควสต์ใหม่ ทำทุกรายการให้สำเร็จก่อน 23:59",
                style = sub,
            )
            quests.filter { it.type != QuestType.DAILY_SIDE.name }.take(8).forEach { q ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${q.stat}  ${q.title}", style = body)
                    Text("${q.progress} / ${q.target}", style = body.copy(fontFamily = Oxanium, color = SysColors.CyanHi))
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                Column { Text("TIME LEFT", style = sub.copy(fontFamily = Oxanium)); BigNumber(timeLeft) }
                Text("ล้มเหลว → PENALTY QUEST", style = sub.copy(color = SysColors.CrimsonText))
            }
            SystemButton("ยอมรับเควสต์", accent, onAccept)
            Text("ปฏิเสธ · ไม่มีตัวเลือกนี้ในโหมดโหด", style = sub.copy(color = SysColors.Muted), modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        }
    }
}

/** Meal-time popup (spec §8.3): pixel dish, numbers, how to order. */
@Composable
fun MealPopup(slotLabel: String, item: MenuItem, leftKcal: Int?, leftBudget: Int?, logged: Boolean, onEat: () -> Unit, onSwap: () -> Unit, onOther: () -> Unit) {
    PopupShell(SysColors.Gold) {
        SystemFrame(accent = SysColors.Gold) {
            SystemHeader(accent = SysColors.Gold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                SystemTag("MEAL TIME", SysColors.Gold)
                Text(slotLabel, style = sub.copy(fontFamily = Oxanium))
            }
            Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                PixelSprite(Sprites.food[item.sprite] ?: Sprites.kapao, pixel = 10.dp)
            }
            Text(item.name, style = body.copy(fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White), modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                Stat3("KCAL", "≈${item.kcal}", SysColors.Cyan)
                Stat3("PROTEIN", "${item.protein} g", SysColors.stat(Stat.STR))
                Stat3("PRICE", "฿${item.price}", SysColors.Gold)
            }
            Text("HOW TO ORDER · พูดกับร้านว่า", style = sub.copy(fontFamily = Oxanium, color = SysColors.Gold))
            Text("\"${item.order}\"", style = body.copy(color = Color(0xFFFFF3D6)))
            if (leftKcal != null && leftBudget != null) Text("หลังมื้อนี้เหลือ ≈$leftKcal kcal · ฿$leftBudget · ค่าประมาณ ±20%", style = sub)
            SystemButton(if (logged) "บันทึกมื้อนี้แล้ว" else "กินตามนี้", SysColors.Gold, onEat, enabled = !logged)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SystemButton("สลับเมนู", SysColors.Cyan, onSwap, Modifier.weight(1f), primary = false)
                SystemButton("กินอย่างอื่น", SysColors.Sub, onOther, Modifier.weight(1f), primary = false)
            }
        }
    }
}

@Composable
private fun Stat3(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = color))
        Text(value, style = TextStyle(fontFamily = Oxanium, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Color.White))
    }
}

@Composable
fun SleepReminderPopup(onOk: () -> Unit, onInBed: () -> Unit) {
    PopupShell(SysColors.Hidden) {
        SystemFrame(accent = SysColors.Hidden) {
            SystemHeader(accent = SysColors.Hidden)
            SystemTag("SYSTEM", SysColors.Hidden)
            Text("อีก 30 นาทีถึงเวลานอน", style = body.copy(fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White))
            Text("วางมือถือ เขียนไดอารี่ 3 บรรทัด แล้วเข้านอน การนอนครบ 7.5 ชม. = CONDITION OPTIMAL (EXP +10%)", style = sub)
            SystemButton("เข้านอนแล้ว", SysColors.Hidden, onInBed)
            SystemButton("รับทราบ", SysColors.Hidden, onOk, primary = false)
        }
    }
}
