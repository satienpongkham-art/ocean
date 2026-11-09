package com.lifesystem.app.ui.menu

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.equipTitle
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.achievements.Achievements
import kotlinx.coroutines.launch

/** MENU tab: the log screens, titles, and data access. */
@Composable
fun MenuScreen(onRoute: (String) -> Unit) {
    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ScreenHeader("MENU", "SYS://LOG")
        listOf(
            Triple("meal", "MEAL PLAN", "จัดเมนูในแคลอรี โปรตีน และงบ"),
            Triple("body", "BODY LOG", "น้ำหนัก รอบเอว น้ำดื่ม"),
            Triple("journal", "JOURNAL", "ไดอารี่ 3 บรรทัด + อารมณ์"),
            Triple("maintenance", "MAINTENANCE", "กิจวัตรตามรอบ ตัดเล็บ โกนหนวด ฯลฯ"),
            Triple("titles", "TITLES", "ฉายาและความสำเร็จ"),
        ).forEach { (route, name, desc) ->
            Row(
                Modifier.fillMaxWidth().heightIn(min = 56.dp).border(1.dp, SysColors.Cyan.copy(alpha = 0.35f)).clickable(role = Role.Button) { onRoute(route) }.padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(name, style = Txt.sys.copy(color = SysColors.CyanHi))
                    Text(desc, style = Txt.sub)
                }
                Text("›", style = Txt.title.copy(color = SysColors.Cyan))
            }
        }
        ScreenHeader("DATA", "การนอนและก้าวจริง")
        HealthAccessPanel()
        Box(Modifier.padding(bottom = 16.dp))
    }
}

/** Titles earned from real history; one can be equipped for +5 % G. */
@Composable
fun TitlesScreen(repo: Repository) {
    val scope = rememberCoroutineScope()
    var unlocked by remember { mutableStateOf(emptySet<String>()) }
    var equipped by remember { mutableStateOf<String?>(null) }
    var menus by remember { mutableIntStateOf(0) }
    var refresh by remember { mutableIntStateOf(0) }
    LaunchedEffect(refresh) {
        unlocked = repo.dao.achievements().map { it.id }.toSet(); equipped = repo.profile()?.titleId; menus = repo.dao.distinctMenus()
    }
    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ScreenHeader("TITLES", "${unlocked.size} / ${Achievements.all.size}")
        Text("ใส่ฉายาได้ทีละอัน · ได้ G เพิ่ม 5% ทุกวัน", style = Txt.sub)
        Achievements.all.forEach { t ->
            val have = t.id in unlocked
            val on = t.id == equipped
            PanelBox(Modifier.fillMaxWidth(), if (on) SysColors.Gold else if (have) SysColors.Cyan else SysColors.Muted) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(if (have) "「${t.name}」" else "「???」", style = Txt.body.copy(color = if (have) Color.White else SysColors.Muted))
                        Text(t.desc, style = Txt.sub)
                    }
                    if (have) SystemButton(if (on) "ถอด" else "ใส่", SysColors.Gold, { scope.launch { repo.equipTitle(if (on) null else t.id); refresh++ } }, Modifier.padding(start = 8.dp), primary = false)
                }
            }
        }
        PanelBox(Modifier.fillMaxWidth(), SysColors.Gold) { Text("สมุดสะสมเมนู: กินมาแล้ว $menus เมนู (10 เมนู = ฉายานักชิม)", style = Txt.body) }
        Box(Modifier.padding(bottom = 16.dp))
    }
}
