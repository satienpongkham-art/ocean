package com.lifesystem.app.ui.log

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.components.LabeledBar
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SysField
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.nutrition.Nutrition
import kotlinx.coroutines.launch

/** Weight/waist (quest "weigh"), sleep hours (CONDITION), water (+250 ml). */
@Composable
fun BodyLogScreen(repo: Repository, today: Long, onMaintenance: () -> Unit) {
    val scope = rememberCoroutineScope()
    var weight by remember { mutableStateOf("") }
    var waist by remember { mutableStateOf("") }
    var sleep by remember { mutableStateOf("") }
    var water by remember { mutableDoubleStateOf(0.0) }
    var msg by remember { mutableStateOf("") }
    var refresh by remember { mutableIntStateOf(0) }
    val weights by repo.recent(MeasureType.WEIGHT, 7).collectAsStateWithLifecycle(initialValue = emptyList())
    LaunchedEffect(refresh) { water = repo.todayTotal(MeasureType.WATER_ML, today) }

    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ScreenHeader("BODY LOG", "VIT")
        PanelBox(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("ชั่งตอนเช้า หลังเข้าห้องน้ำ ก่อนกินอะไร", style = Txt.sub)
                SysField("น้ำหนัก (กก.)", weight, { weight = it }, number = true)
                SysField("รอบเอวแนวสะดือ (ซม.)", waist, { waist = it }, number = true)
                SystemButton("บันทึกร่างกาย", SysColors.Cyan, {
                    scope.launch {
                        val w = weight.toDoubleOrNull()
                        if (w == null) { msg = "กรอกน้ำหนักก่อน"; return@launch }
                        repo.logMeasurement(MeasureType.WEIGHT, w)
                        waist.toDoubleOrNull()?.let { repo.logMeasurement(MeasureType.WAIST, it) }
                        repo.complete(today, "weigh")
                        msg = "บันทึกแล้ว · เควสต์ชั่งน้ำหนักสำเร็จ"; weight = ""; waist = ""
                    }
                })
                val avg = weights.takeIf { it.isNotEmpty() }?.map { it.value }?.average()
                Text(avg?.let { "น้ำหนักเฉลี่ย ${weights.size} ครั้งล่าสุด ≈ %.1f กก.".format(it) } ?: "ยังไม่มีข้อมูลน้ำหนัก", style = Txt.sub)
            }
        }
        PanelBox(Modifier.fillMaxWidth(), SysColors.Hidden) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("ชั่วโมงนอนเมื่อคืน (ใช้คำนวณ CONDITION จนกว่าจะเชื่อม Health Connect)", style = Txt.sub)
                SysField("ชั่วโมง เช่น 7.5", sleep, { sleep = it }, number = true)
                SystemButton("บันทึกการนอน", SysColors.Hidden, {
                    scope.launch {
                        val h = sleep.toDoubleOrNull()?.takeIf { it in 0.0..16.0 } ?: run { msg = "กรอกชั่วโมงนอน 0–16"; return@launch }
                        repo.logMeasurement(MeasureType.SLEEP_H, h)
                        msg = "บันทึกการนอนแล้ว"; sleep = ""
                    }
                }, primary = false)
            }
        }
        PanelBox(Modifier.fillMaxWidth(), Color3) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val target = Nutrition.WATER_ML_DEFAULT
                LabeledBar("WATER", "%.2f / %.1f L".format(water / 1000, target / 1000.0), (water / target).toFloat(), Color3)
                SystemButton("+250 มล.", Color3, {
                    scope.launch {
                        repo.logMeasurement(MeasureType.WATER_ML, 250.0)
                        repo.addProgress(today, "water", 250)
                        refresh++
                    }
                })
            }
        }
        if (msg.isNotEmpty()) Text(msg, style = Txt.body.copy(color = SysColors.Mint))
        Row { SystemButton("MAINTENANCE · กิจวัตรตามรอบ", SysColors.Emergency, onMaintenance, primary = false) }
    }
}

private val Color3 = androidx.compose.ui.graphics.Color(0xFF3FB6FF)
