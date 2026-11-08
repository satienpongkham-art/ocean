package com.lifesystem.app.ui.log

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.components.HudBar
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.maintenance.Maintenance
import kotlinx.coroutines.launch

@Composable
fun MaintenanceScreen(repo: Repository, today: Long) {
    val scope = rememberCoroutineScope()
    val rows by repo.maintenanceFlow().collectAsStateWithLifecycle(initialValue = emptyList())
    val last = rows.associate { it.routineId to it.lastDoneEpochDay }
    LazyColumn(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            ScreenHeader("MAINTENANCE", "DURABILITY")
            Text("หลอดหมด = เควสต์หลักของวันนั้น · ไม่ใช้คอตตอนบัดแคะหู (AAO-HNS)", style = Txt.sub)
        }
        items(Maintenance.defaults, key = { it.id }) { r ->
            val d = Maintenance.durability(last[r.id], today, r.intervalDays)
            val color = if (d <= Maintenance.DUE_AT) SysColors.Emergency else SysColors.Mint
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(Modifier.weight(1f)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(r.title, style = Txt.body)
                        Text("${(d * 100).toInt()}% · ทุก ${r.intervalDays} วัน", style = Txt.sub)
                    }
                    HudBar(d.toFloat(), color, Modifier.padding(top = 4.dp), segments = 8)
                }
                SystemButton("ทำแล้ว", color, { scope.launch { repo.markMaintenanceDone(r.id, today) } }, Modifier.width(96.dp), primary = false)
            }
        }
    }
}
