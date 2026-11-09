package com.lifesystem.app.ui.menu

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.lifesystem.app.SystemApp
import com.lifesystem.app.health.HealthConnectSource
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors

/** Grants for real data: Health Connect (sleep, steps), usage access (screen on/off), step sensor. */
@Composable
fun HealthAccessPanel() {
    val ctx = LocalContext.current
    val app = ctx.applicationContext as SystemApp
    var refresh by remember { mutableIntStateOf(0) }
    var hcGranted by remember { mutableStateOf(emptySet<String>()) }
    val hcAvailable = remember { app.healthSource.available() }
    val usage = remember(refresh) { app.screenSource.granted() }
    val activity = remember(refresh) { ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED }
    LaunchedEffect(refresh) { hcGranted = app.healthSource.grantedPermissions() }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { refresh++ }
    val hcLauncher = rememberLauncherForActivityResult(PermissionController.createRequestPermissionResultContract()) { refresh++ }
    val actLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { refresh++ }
    fun mark(ok: Boolean) = if (ok) "✓ " else "○ "

    PanelBox(Modifier.fillMaxWidth(), SysColors.Hidden) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("ข้อมูลจริงสำหรับเวลานอนและก้าวเดิน (อ่านอย่างเดียว เก็บในเครื่อง)", style = Txt.sub)
            val hcAll = HealthConnectSource.PERMISSIONS.all { it in hcGranted }
            if (hcAvailable) {
                SystemButton(mark(hcAll) + "Health Connect · การนอน + ก้าวเดิน", SysColors.Hidden, { hcLauncher.launch(HealthConnectSource.PERMISSIONS) }, primary = false)
                Text("Samsung Health → ตั้งค่า → Health Connect → เปิดซิงก์ การนอน/ก้าว", style = Txt.sub)
            } else {
                SystemButton("○ ติดตั้ง Health Connect", SysColors.Hidden, {
                    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                }, primary = false)
            }
            SystemButton(mark(usage) + "เวลาใช้งานแอป · ประมาณเวลานอนจากหน้าจอ", SysColors.Hidden, {
                ctx.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }, primary = false)
            SystemButton(mark(activity) + "กิจกรรมการเคลื่อนไหว · นับก้าว", SysColors.Hidden, { actLauncher.launch(Manifest.permission.ACTIVITY_RECOGNITION) }, primary = false)
            Text(
                if (usage || hcAll) "เควสต์เข้านอนและปิดจอก่อนนอน จะตรวจอัตโนมัติทุกเช้า" else "ยังไม่ได้อนุญาต: เควสต์เข้านอนต้องกดยืนยันเองไปก่อน",
                style = Txt.sub.copy(color = if (usage || hcAll) SysColors.Mint else SysColors.Emergency),
            )
        }
    }
}
