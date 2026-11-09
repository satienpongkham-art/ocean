package com.lifesystem.app.backup

import android.content.Context
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.lifesystem.app.MainActivity
import com.lifesystem.app.data.SystemDb
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SysField
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import kotlin.system.exitProcess

/** Encrypted export/import of the whole database (progress photos stay on the phone). */
object Backup {
    private fun dbFile(ctx: Context) = ctx.getDatabasePath("system.db")

    fun export(ctx: Context, password: CharArray): ByteArray {
        val db = SystemDb.get(ctx)
        db.openHelper.writableDatabase.query("PRAGMA wal_checkpoint(FULL)").use { it.moveToFirst() }
        return BackupCrypto.encrypt(dbFile(ctx).readBytes(), password)
    }

    /** Replaces the database and restarts the app. Returns false on a wrong password or a non-System file. */
    fun import(ctx: Context, data: ByteArray, password: CharArray): Boolean {
        val plain = BackupCrypto.decrypt(data, password) ?: return false
        if (!String(plain.copyOfRange(0, 15)).startsWith("SQLite format 3")) return false
        SystemDb.get(ctx).close()
        val f = dbFile(ctx)
        File(f.path + "-wal").delete(); File(f.path + "-shm").delete()
        f.writeBytes(plain)
        ctx.startActivity(Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        exitProcess(0)
    }
}

@Composable
fun BackupScreen() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var password by remember { mutableStateOf("") }
    var msg by remember { mutableStateOf("") }
    val create = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { uri ->
        if (uri != null) scope.launch {
            msg = withContext(Dispatchers.IO) {
                runCatching { ctx.contentResolver.openOutputStream(uri)?.use { it.write(Backup.export(ctx, password.toCharArray())) }; "ส่งออกแล้ว · เก็บไฟล์และรหัสผ่านไว้ให้ดี" }.getOrElse { "ส่งออกไม่สำเร็จ" }
            }
        }
    }
    val open = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            val ok = withContext(Dispatchers.IO) { runCatching { ctx.contentResolver.openInputStream(uri)?.use { Backup.import(ctx, it.readBytes(), password.toCharArray()) } ?: false }.getOrDefault(false) }
            if (!ok) msg = "กู้คืนไม่ได้ · รหัสผ่านผิด หรือไม่ใช่ไฟล์สำรองของ System"
        }
    }
    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        ScreenHeader("BACKUP", "เข้ารหัส")
        Text("ไฟล์สำรองเข้ารหัสด้วยรหัสผ่านนี้ · ลืมรหัส = เปิดไฟล์ไม่ได้ · รูปก่อน/หลังไม่รวมในไฟล์", style = Txt.sub)
        SysField("รหัสผ่าน (อย่างน้อย 8 ตัว)", password, { password = it })
        SystemButton("ส่งออกข้อมูล", SysColors.Cyan, { create.launch("system-backup-${LocalDate.now()}.sysbak") }, enabled = password.length >= 8)
        SystemButton("กู้คืนจากไฟล์ (ข้อมูลในเครื่องจะถูกแทนที่)", SysColors.Crimson, { open.launch(arrayOf("*/*")) }, primary = false, enabled = password.length >= 8)
        if (msg.isNotEmpty()) Text(msg, style = Txt.body.copy(color = SysColors.Mint))
    }
}
