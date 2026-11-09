package com.lifesystem.app.ui.settings

import android.content.Intent
import android.provider.Settings
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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.lifesystem.app.SystemApp
import com.lifesystem.app.data.Keys
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.getBool
import com.lifesystem.app.data.getInt
import com.lifesystem.app.data.getSetting
import com.lifesystem.app.data.putBool
import com.lifesystem.app.data.putSetting
import com.lifesystem.app.data.useSickDay
import com.lifesystem.app.schedule.rearmAlarms
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SysField
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.onboarding.OnboardingInput
import com.lifesystem.app.ui.theme.SysColors
import kotlinx.coroutines.launch

private fun hhmm(m: Int) = "%02d:%02d".format(m / 60 % 24, m % 60)

@Composable
private fun Toggle(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp).clickable { onChange(!checked) }, verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked, onChange, colors = CheckboxDefaults.colors(checkedColor = SysColors.Cyan, uncheckedColor = SysColors.Sub))
        Text(label, style = Txt.body)
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Text(title, style = Txt.sys.copy(color = SysColors.CyanHi))
    PanelBox(Modifier.fillMaxWidth()) { Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { content() } }
}

/** Everything the player can change after onboarding (round 2). Saving re-arms all alarms. */
@Composable
fun SettingsScreen(repo: Repository, today: Long, onBackup: () -> Unit) {
    val ctx = LocalContext.current
    val app = ctx.applicationContext as SystemApp
    val scope = rememberCoroutineScope()
    var loaded by remember { mutableStateOf(false) }
    var wake by remember { mutableStateOf("07:00") }
    var sleep by remember { mutableStateOf("23:00") }
    var meals by remember { mutableStateOf(listOf("07:30", "12:00", "18:00", "20:00")) }
    var budget by remember { mutableStateOf("2000") }
    var goal by remember { mutableStateOf("") }
    var sunscreen by remember { mutableStateOf(false) }
    var tape by remember { mutableStateOf(true) }
    var armband by remember { mutableStateOf(false) }
    var mealPopups by remember { mutableStateOf(setOf(0, 1, 2, 3)) }
    var sleepPopup by remember { mutableStateOf(true) }
    var sound by remember { mutableStateOf(true) }
    var posture by remember { mutableStateOf(true) }
    var screenBoss by remember { mutableStateOf(false) }
    var cap by remember { mutableStateOf("120") }
    var work by remember { mutableStateOf("") }
    var lockOn by remember { mutableStateOf(false) }
    var lockApps by remember { mutableStateOf(setOf<String>()) }
    var trainingFrom by remember { mutableStateOf("18:00") }
    var msg by remember { mutableStateOf("") }
    val launchable = remember { installedApps(ctx) }

    LaunchedEffect(Unit) {
        val p = repo.profile() ?: return@LaunchedEffect
        wake = hhmm(p.wakeMin); sleep = hhmm(p.sleepMin); meals = p.mealMinutes().map(::hhmm)
        budget = p.weeklyBudget.toString(); goal = p.goalWeightKg?.toString() ?: ""
        sunscreen = p.hasSunscreen; tape = p.hasTapeMeasure; armband = p.hasArmband
        mealPopups = repo.getSetting(Keys.POPUP_MEALS, "0,1,2,3").split(',').mapNotNull { it.trim().toIntOrNull() }.toSet()
        sleepPopup = repo.getBool(Keys.POPUP_SLEEP, true); sound = repo.getBool(Keys.SOUND, true); posture = repo.getBool(Keys.POSTURE, true)
        screenBoss = repo.getBool(Keys.SCREEN_BOSS, false); cap = repo.getInt(Keys.SCREEN_CAP, 120).toString()
        work = repo.getSetting(Keys.WORK, ""); lockOn = repo.getBool(Keys.LOCK_ON, false)
        lockApps = repo.getSetting(Keys.LOCK_APPS, "").split(',').filter { it.isNotBlank() }.toSet()
        trainingFrom = hhmm(repo.getInt(Keys.LOCK_TRAINING_FROM, 18 * 60))
        loaded = true
    }

    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ScreenHeader("SETTINGS", "ตั้งค่า")
        if (!loaded) { Text("กำลังโหลด…", style = Txt.sub); return@Column }
        Section("ตารางชีวิต") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SysField("ตื่น (HH:MM)", wake, { wake = it }, modifier = Modifier.weight(1f))
                SysField("นอน (HH:MM)", sleep, { sleep = it }, modifier = Modifier.weight(1f))
            }
            listOf("มื้อเช้า", "มื้อกลางวัน", "มื้อเย็น", "มื้อว่าง").forEachIndexed { i, label ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SysField(label, meals.getOrElse(i) { "12:00" }, { v -> meals = meals.toMutableList().also { l -> while (l.size <= i) l += "12:00"; l[i] = v } }, modifier = Modifier.weight(1f))
                    Checkbox(i in mealPopups, { on -> mealPopups = if (on) mealPopups + i else mealPopups - i }, colors = CheckboxDefaults.colors(checkedColor = SysColors.Cyan))
                    Text("เด้ง", style = Txt.sub)
                }
            }
            Toggle("หน้าต่างเตือนนอน (ก่อนนอน 30 นาที)", sleepPopup) { sleepPopup = it }
        }
        Section("เงินและเป้าหมาย") {
            SysField("งบต่อสัปดาห์ (บาท)", budget, { budget = it.filter(Char::isDigit) }, number = true)
            SysField("น้ำหนักเป้าหมาย (กก.)", goal, { goal = it }, number = true)
        }
        Section("ของที่มีจริง") {
            Toggle("ครีมกันแดด", sunscreen) { sunscreen = it }
            Toggle("สายวัด", tape) { tape = it }
            Toggle("ปลอกแขนใส่มือถือ", armband) { armband = it }
        }
        Section("System") {
            Toggle("เสียง System (สำเร็จ · เลเวลอัป · ประตูเปิด)", sound) { sound = it }
            Toggle("ตรวจหลังค่อม (ก้มมองจอนาน 15 นาที → เตือน)", posture) { posture = it }
            Toggle("Screen-time Boss (ต้องอนุญาตเวลาใช้งานแอป)", screenBoss) { screenBoss = it }
            if (screenBoss) SysField("เพดานโซเชียล/เกมต่อวัน (นาที)", cap, { cap = it.filter(Char::isDigit) }, number = true)
        }
        Section("เควสต์งาน (บรรทัดละ 1 เควสต์ · ชื่อ|จำนวน)") {
            OutlinedTextField(
                work, { work = it }, Modifier.fillMaxWidth().heightIn(min = 100.dp), textStyle = Txt.body,
                placeholder = { Text("ลงคลิป 1 ชิ้น|1\nโพสต์กลุ่ม|20\nตอบข้อความ|1", style = Txt.sub) },
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = SysColors.Cyan, unfocusedBorderColor = SysColors.Cyan.copy(alpha = 0.35f), focusedTextColor = Color.White, unfocusedTextColor = Color.White),
            )
        }
        Section("ล็อกแอป (โหมดโหด)") {
            Toggle("เปิดล็อกแอป", lockOn) { lockOn = it }
            Text("ล็อกเช้า: ตั้งแต่ตื่นจนกว่าจะทำเควสต์ตื่น + ชั่งน้ำหนักเสร็จ · ล็อกฝึก: ตั้งแต่เวลาด้านล่างจนกว่าวิดพื้น + สควอทครบ · ล็อกลงโทษ: ระหว่างเควสต์ลงโทษ · โทรศัพท์ ข้อความ แผนที่ ไม่ถูกล็อก", style = Txt.sub)
            SysField("ล็อกฝึกเริ่ม (HH:MM)", trainingFrom, { trainingFrom = it })
            SystemButton("เปิดสิทธิ์ Accessibility ให้ System", SysColors.Hidden, {
                ctx.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }, primary = false)
            Text("แอปที่จะล็อก:", style = Txt.sub)
            launchable.forEach { (pkg, label) -> Toggle(label, pkg in lockApps) { on -> lockApps = if (on) lockApps + pkg else lockApps - pkg } }
            SystemButton("ใช้วันป่วยวันนี้ (เดือนละ 2 วัน · ไม่ล็อก ไม่ลงโทษ ไม่ได้รางวัล)", SysColors.Emergency, {
                scope.launch { msg = if (repo.useSickDay(today)) "ใช้วันป่วยแล้ว · พักให้หาย" else "ใช้ไม่ได้ (ครบ 2 วันแล้ว หรือวันนี้ปิดไปแล้ว)" }
            }, primary = false)
        }
        Section("สำรองข้อมูล") {
            Text("ส่งออกข้อมูลทั้งหมดเป็นไฟล์เข้ารหัสด้วยรหัสผ่านของคุณ เก็บไว้ใน Drive หรือคอม · ใช้กู้คืนเมื่อเปลี่ยนเครื่อง", style = Txt.sub)
            SystemButton("ส่งออก / กู้คืนข้อมูล", SysColors.Cyan, onBackup, primary = false)
        }
        if (msg.isNotEmpty()) Text(msg, style = Txt.body.copy(color = SysColors.Mint))
        SystemButton("บันทึกการตั้งค่า", SysColors.Cyan, {
            scope.launch {
                val p = repo.profile() ?: return@launch
                val mealMins = meals.map { OnboardingInput.minutes(it) }
                if (mealMins.any { it == null } || OnboardingInput.minutes(wake) == null || OnboardingInput.minutes(sleep) == null) {
                    msg = "รูปแบบเวลาไม่ถูก ใช้ HH:MM เช่น 07:30"; return@launch
                }
                repo.saveProfile(p.copy(
                    wakeMin = OnboardingInput.minutes(wake)!!, sleepMin = OnboardingInput.minutes(sleep)!!,
                    mealTimes = mealMins.filterNotNull().joinToString(","), weeklyBudget = budget.toIntOrNull() ?: p.weeklyBudget,
                    goalWeightKg = goal.toDoubleOrNull(), hasSunscreen = sunscreen, hasTapeMeasure = tape, hasArmband = armband,
                ))
                repo.putSetting(Keys.POPUP_MEALS, mealPopups.sorted().joinToString(",")); repo.putBool(Keys.POPUP_SLEEP, sleepPopup)
                repo.putBool(Keys.SOUND, sound); repo.putBool(Keys.POSTURE, posture)
                repo.putBool(Keys.SCREEN_BOSS, screenBoss); repo.putSetting(Keys.SCREEN_CAP, (cap.toIntOrNull() ?: 120).toString())
                repo.putSetting(Keys.WORK, work.trim()); repo.putBool(Keys.LOCK_ON, lockOn)
                repo.putSetting(Keys.LOCK_APPS, lockApps.joinToString(","))
                repo.putSetting(Keys.LOCK_TRAINING_FROM, (OnboardingInput.minutes(trainingFrom) ?: 18 * 60).toString())
                rearmAlarms(app)
                msg = "บันทึกแล้ว · เวลาใหม่มีผลกับป๊อปอัปทันที · เควสต์ใหม่มีผลกับกระดานพรุ่งนี้"
            }
        })
        Box(Modifier.padding(bottom = 24.dp))
    }
}

/** Launchable apps (label sorted) for the lock list; never offers this app or the phone/SMS apps. */
fun installedApps(ctx: android.content.Context): List<Pair<String, String>> {
    val pm = ctx.packageManager
    val main = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val never = com.lifesystem.app.lock.LockRules.neverLock(ctx)
    return pm.queryIntentActivities(main, 0).map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
        .filter { it.first !in never }.distinctBy { it.first }.sortedBy { it.second.lowercase() }
}
