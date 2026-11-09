package com.lifesystem.app.ui.onboarding

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.lifesystem.app.SystemApp
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.ProfileEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.schedule.AlarmScheduler
import com.lifesystem.app.ui.components.SysField
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.SystemFrame
import com.lifesystem.app.ui.components.SystemHeader
import com.lifesystem.app.ui.components.SystemTag
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import kotlinx.coroutines.launch

/** Parsed onboarding answers; [toProfile] fails soft with defaults (spec §3). */
data class OnboardingInput(
    val name: String = "", val age: String = "25", val male: Boolean = true, val height: String = "",
    val goalWeight: String = "", val wake: String = "07:00", val sleep: String = "23:00", val budget: String = "2000",
    val sunscreen: Boolean = false, val tape: Boolean = true, val armband: Boolean = false,
    val weight: String = "", val waist: String = "", val pushup: String = "", val plank: String = "", val rope: String = "",
) {
    fun toProfile(today: Long) = ProfileEntity(
        name = name.ifBlank { "ผู้เล่น" }, age = age.toIntOrNull() ?: 25, sex = if (male) "MALE" else "FEMALE",
        heightCm = height.toDoubleOrNull() ?: 170.0, day0EpochDay = today,
        wakeMin = minutes(wake) ?: 7 * 60, sleepMin = minutes(sleep) ?: 23 * 60,
        weeklyBudget = budget.toIntOrNull() ?: 2000, goalWeightKg = goalWeight.toDoubleOrNull(),
        hasSunscreen = sunscreen, hasTapeMeasure = tape, hasArmband = armband,
    )

    fun day0(): List<Pair<String, Double>> = listOfNotNull(
        weight.toDoubleOrNull()?.let { MeasureType.WEIGHT to it }, waist.toDoubleOrNull()?.let { MeasureType.WAIST to it },
        pushup.toDoubleOrNull()?.let { MeasureType.PUSHUP_MAX to it }, plank.toDoubleOrNull()?.let { MeasureType.PLANK_SEC to it },
        rope.toDoubleOrNull()?.let { MeasureType.ROPE_SEC to it },
    )

    companion object {
        fun minutes(hhmm: String): Int? {
            val parts = hhmm.trim().split(':', '.')
            val h = parts.getOrNull(0)?.toIntOrNull() ?: return null
            val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
            return if (h in 0..23 && m in 0..59) h * 60 + m else null
        }
    }
}

@Composable
fun OnboardingScreen(repo: Repository, today: Long, onDone: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var step by remember { mutableIntStateOf(0) }
    var input by remember { mutableStateOf(OnboardingInput()) }
    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    fun open(action: String, withPackage: Boolean = true) = runCatching {
        ctx.startActivity(Intent(action).apply { if (withPackage) data = Uri.parse("package:${ctx.packageName}") })
    }
    val steps = 6
    Column(Modifier.padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SystemFrame {
            SystemHeader()
            SystemTag("SETUP ${step + 1} / $steps", SysColors.Cyan)
            when (step) {
                0 -> {
                    Text("SYSTEM ONLINE", style = Txt.title)
                    Text("ผู้เล่นได้รับสิทธิ์เข้าใช้ System ระบบจะสั่งเควสต์ทุกวัน และเลเวลจะขึ้นเมื่อร่างกายเปลี่ยนจริงเท่านั้น", style = Txt.body)
                    SysField("ชื่อผู้เล่น", input.name, { input = input.copy(name = it) })
                }
                1 -> {
                    Text("โปรไฟล์", style = Txt.title)
                    SysField("อายุ", input.age, { input = input.copy(age = it) }, number = true)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SystemButton("ชาย", if (input.male) SysColors.Cyan else SysColors.Muted, { input = input.copy(male = true) }, Modifier.weight(1f), primary = input.male)
                        SystemButton("หญิง", if (!input.male) SysColors.Cyan else SysColors.Muted, { input = input.copy(male = false) }, Modifier.weight(1f), primary = !input.male)
                    }
                    SysField("ส่วนสูง (ซม.)", input.height, { input = input.copy(height = it) }, number = true)
                    SysField("น้ำหนักเป้าหมาย (กก.) · ไม่บังคับ", input.goalWeight, { input = input.copy(goalWeight = it) }, number = true)
                }
                2 -> {
                    Text("ตารางชีวิตและเงิน", style = Txt.title)
                    SysField("เวลาตื่น (HH:MM)", input.wake, { input = input.copy(wake = it) })
                    SysField("เวลานอน (HH:MM)", input.sleep, { input = input.copy(sleep = it) })
                    SysField("งบใช้จ่ายต่อสัปดาห์ (บาท)", input.budget, { input = input.copy(budget = it) }, number = true)
                    Text("ของที่มีอยู่จริง", style = Txt.sys)
                    Check("ครีมกันแดด SPF 30+", input.sunscreen) { input = input.copy(sunscreen = it) }
                    Check("สายวัดตัว", input.tape) { input = input.copy(tape = it) }
                    Check("ปลอกแขนใส่มือถือ", input.armband) { input = input.copy(armband = it) }
                }
                3 -> {
                    Text("ค่า Day 0", style = Txt.title)
                    Text("วัดตอนเช้าก่อนกินอะไร ข้ามช่องที่ยังไม่ได้วัดได้ (สเตตัสจะแสดง ?)", style = Txt.sub)
                    SysField("น้ำหนัก (กก.)", input.weight, { input = input.copy(weight = it) }, number = true)
                    SysField("รอบเอวแนวสะดือ (ซม.)", input.waist, { input = input.copy(waist = it) }, number = true)
                    SysField("วิดพื้นสูงสุดแบบไม่พัก (ครั้ง)", input.pushup, { input = input.copy(pushup = it) }, number = true)
                    SysField("แพลงก์สูงสุด (วินาที)", input.plank, { input = input.copy(plank = it) }, number = true)
                    SysField("เชือกกระโดดต่อเนื่อง (วินาที)", input.rope, { input = input.copy(rope = it) }, number = true)
                }
                4 -> {
                    Text("สิทธิ์ของ System", style = Txt.title)
                    Text("ทุกข้อจำเป็นเพื่อให้หน้าต่างเด้งตรงเวลาบนหน้าล็อก", style = Txt.sub)
                    if (Build.VERSION.SDK_INT >= 33) SystemButton("1 · อนุญาตการแจ้งเตือน", SysColors.Cyan, { notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) }, primary = false)
                    if (Build.VERSION.SDK_INT >= 34) SystemButton("2 · อนุญาตแจ้งเตือนเต็มหน้าจอ", SysColors.Cyan, { open(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT) }, primary = false)
                    if (Build.VERSION.SDK_INT >= 31) SystemButton("3 · อนุญาตปลุกตรงเวลา", SysColors.Cyan, { open(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM) }, primary = false)
                    SystemButton("4 · แบตเตอรี่: ไม่จำกัด", SysColors.Cyan, { open(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) }, primary = false)
                    Text("Samsung: ตั้งค่า → แบตเตอรี่ → ขีดจำกัดการใช้งานเบื้องหลัง → แอปที่ไม่เข้าสู่โหมดสลีปเลย → เพิ่ม System", style = Txt.sub)
                }
                else -> {
                    Text("ทดสอบหน้าต่างเด้ง", style = Txt.title)
                    Text("กดปุ่ม แล้วปิดหน้าจอทันที ภายใน 10 วินาทีหน้าต่าง System ต้องเด้งบนหน้าล็อก ถ้าไม่เด้ง กลับไปตั้งสิทธิ์ข้อ 2–4", style = Txt.body)
                    SystemButton("ทดสอบใน 10 วินาที", SysColors.Gold, { AlarmScheduler(ctx).scheduleTest() }, primary = false)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (step > 0) SystemButton("ย้อนกลับ", SysColors.Muted, { step-- }, Modifier.weight(1f), primary = false)
                SystemButton(if (step == steps - 1) "เริ่ม DAY 1" else "ถัดไป", SysColors.Cyan, {
                    if (step < steps - 1) step++ else {
                        // App scope: saving the profile swaps this screen out, which would cancel a screen scope mid-way.
                        val app = ctx.applicationContext as SystemApp
                        app.appScope.launch {
                            val profile = input.toProfile(today)
                            input.day0().forEach { (type, v) -> repo.logMeasurement(type, v) }
                            repo.seedMaintenance(today)
                            AlarmScheduler(app).scheduleAll(profile)
                            repo.saveProfile(profile) // last: this is what switches the UI to the Quest Log
                            repo.ensureBoard(today)
                        }
                        onDone()
                    }
                }, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun Check(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp).clickable { onChange(!checked) }, verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked, onChange, colors = CheckboxDefaults.colors(checkedColor = SysColors.Cyan, uncheckedColor = SysColors.Sub))
        Text(label, style = Txt.body)
    }
}
