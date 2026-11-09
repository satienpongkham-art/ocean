package com.lifesystem.app.lock

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lifesystem.app.MainActivity
import com.lifesystem.app.Routes
import com.lifesystem.app.ui.components.CrimsonFlash
import com.lifesystem.app.ui.components.SystemBackground
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.SystemFrame
import com.lifesystem.app.ui.components.SystemHeader
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.app.ui.theme.SystemTheme

/** Shown over a locked app. Back or Home leaves to the launcher; the quest button opens the System. */
class LockActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val reason = runCatching { LockReason.valueOf(intent.getStringExtra(EXTRA_REASON) ?: "") }.getOrDefault(LockReason.MORNING)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) { override fun handleOnBackPressed() = goHome() })
        setContent {
            SystemTheme {
                SystemBackground(SysColors.Crimson) {
                    Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                        SystemFrame(accent = SysColors.Crimson) {
                            SystemHeader("LOCKED", SysColors.Crimson)
                            Text(reason.title, style = Txt.title.copy(color = SysColors.CrimsonText, fontSize = 26.sp))
                            Text(reason.text, style = Txt.body)
                            Text("ไม่มีปุ่มจ่ายเงินปลดล็อก · วันป่วยใช้ได้ในหน้า SETTINGS", style = Txt.sub)
                            SystemButton("ไปทำเควสต์", SysColors.Crimson, {
                                startActivity(Intent(this@LockActivity, MainActivity::class.java)
                                    .putExtra(MainActivity.EXTRA_ROUTE, if (reason == LockReason.FOCUS) Routes.FOCUS else Routes.QUESTS)
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                                finish()
                            })
                            SystemButton("กลับหน้าหลัก", SysColors.Muted, { goHome() }, primary = false)
                        }
                    }
                    CrimsonFlash()
                }
            }
        }
    }

    private fun goHome() {
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    companion object { const val EXTRA_REASON = "reason" }
}
