package com.lifesystem.app.screens

import android.graphics.Bitmap
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.Modifier
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.dp
import com.lifesystem.app.data.AvatarLook
import com.lifesystem.app.ui.components.AvatarArt
import com.lifesystem.app.ui.components.AvatarView
import com.lifesystem.app.ui.components.GoalRow
import com.lifesystem.app.ui.components.QuestInfoWindow
import com.lifesystem.app.ui.quest.CategoryAvatar
import com.lifesystem.app.ui.quest.QuestWindows
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.app.ui.theme.SystemTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/** Renders key screens to PNG (build/screens) so the design can be reviewed without a device. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ScreenshotTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    private fun save(name: String) {
        compose.waitForIdle()
        val view = compose.activity.window.decorView
        val bmp = Bitmap.createBitmap(view.width.coerceAtLeast(1), view.height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        view.draw(android.graphics.Canvas(bmp))
        val dir = File("build/screens").apply { mkdirs() }
        File(dir, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test fun questWindow() {
        compose.setContent {
            SystemTheme {
                Column(Modifier.background(SysColors.Void).padding(16.dp)) {
                    QuestInfoWindow(
                        subtitle = "ร่างกาย · ฝึกให้แข็งแกร่ง",
                        accent = SysColors.stat(com.lifesystem.engine.model.Stat.STR),
                        goals = listOf(
                            GoalRow("pushup", "วิดพื้น", 37, 50, false), GoalRow("squat", "สควอท", 100, 100, true),
                            GoalRow("situp", "ซิทอัพ", 12, 50, false), GoalRow("steps", "เดินให้ครบ", 4321, 6000, false),
                            GoalRow("gate", "GATE · วิดพื้น", 0, 20, false, note = "เปิด 14:20"),
                        ),
                        caution = QuestWindows.CAUTION, timer = "15:42:07",
                        avatar = { CategoryAvatar(AvatarLook(stage = 1), "STR") },
                    )
                }
            }
        }
        save("quest_window")
    }

    @Test fun avatarStages() {
        compose.setContent {
            SystemTheme {
                Column(Modifier.background(SysColors.Void).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) { (1..5).forEach { AvatarView(it, pixel = 3.5.dp) } }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AvatarView(3, pixel = 4.dp, outfit = "outfit_jacket", weapon = "weapon_dagger")
                        AvatarView(4, pixel = 4.dp, outfit = "outfit_coat", weapon = "weapon_sword", aura = AvatarArt.auras["aura_gold"])
                        AvatarView(5, pixel = 4.dp, outfit = "job_sage", weapon = "weapon_staff", aura = AvatarArt.auras["aura_violet"])
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.width(400.dp)) {
                        listOf("STR", "VIT", "CHA", "MND", "INT").forEach { CategoryAvatar(AvatarLook(stage = 2), it, pixel = 2.5f) }
                    }
                }
            }
        }
        save("avatars")
    }

    @Test fun systemCall() {
        val state = com.lifesystem.app.ui.system.SystemState(
            nowMin = 19 * 60, requiredLeft = 4, requiredTotal = 17, openGate = "GATE 2" to 25, bossDay = true,
            condition = com.lifesystem.engine.model.Condition.OPTIMAL, sleepH = 7.8, expScrolls = 1, nextMealMin = 20 * 60, steps = 4200 to 6000,
        )
        val ui = com.lifesystem.app.ui.system.SystemCallUi("ผู้เล่น", 3, 640, 820, "ผู้ตื่นก่อนรุ่งอรุณ", AvatarLook(stage = 2, outfit = "outfit_hoodie", aura = "aura_cyan"),
            com.lifesystem.app.ui.system.SystemMessages.build(state))
        compose.setContent { SystemTheme { Column(Modifier.background(SysColors.Void).padding(16.dp)) { com.lifesystem.app.ui.system.SystemCallContent(ui, {}, {}) } } }
        save("system_call")
    }
}
