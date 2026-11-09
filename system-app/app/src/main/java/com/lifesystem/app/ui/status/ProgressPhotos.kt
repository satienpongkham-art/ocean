package com.lifesystem.app.ui.status

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate

/** Progress photos live only in the app's private storage (never uploaded, not backed up). */
object ProgressPhotos {
    private const val MAX_PX = 1080

    fun dir(ctx: Context) = File(ctx.filesDir, "progress").apply { mkdirs() }

    fun list(ctx: Context): List<File> = dir(ctx).listFiles { f -> f.extension == "jpg" }.orEmpty().sortedBy { it.name }

    /** Copies the picked image, downscaled, as `<epochDay>.jpg` (one per day; a new pick replaces it). */
    fun save(ctx: Context, uri: Uri, epochDay: Long): Boolean = runCatching {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        ctx.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= MAX_PX) sample *= 2
        val bmp = ctx.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) } ?: return false
        File(dir(ctx), "$epochDay.jpg").outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 85, it) }
        true
    }.getOrDefault(false)

    fun load(f: File): ImageBitmap? = runCatching {
        BitmapFactory.decodeFile(f.path, BitmapFactory.Options().apply { inSampleSize = 2 })?.asImageBitmap()
    }.getOrNull()

    fun dateOf(f: File): String = f.nameWithoutExtension.toLongOrNull()?.let { LocalDate.ofEpochDay(it).toString() } ?: f.name
}

/** First vs latest progress photo, plus a button to add today's (same pose, same light, every 2 weeks). */
@Composable
fun ProgressPhotoPanel(today: Long) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var refresh by remember { mutableIntStateOf(0) }
    var files by remember { mutableStateOf(emptyList<File>()) }
    var first by remember { mutableStateOf<ImageBitmap?>(null) }
    var last by remember { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(refresh) {
        withContext(Dispatchers.IO) {
            val l = ProgressPhotos.list(ctx)
            files = l; first = l.firstOrNull()?.let(ProgressPhotos::load); last = l.drop(1).lastOrNull()?.let(ProgressPhotos::load)
        }
    }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch { withContext(Dispatchers.IO) { ProgressPhotos.save(ctx, uri, today) }; refresh++ }
    }
    PanelBox(Modifier.fillMaxWidth(), SysColors.Hidden) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("รูปก่อน/หลัง · เก็บในเครื่องนี้เท่านั้น ไม่ถูกส่งไปไหน", style = Txt.sub)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("ก่อน" to (first to files.firstOrNull()), "ล่าสุด" to (last to files.drop(1).lastOrNull())).forEach { (label, pair) ->
                    Column(Modifier.weight(1f)) {
                        Text(label + (pair.second?.let { " · " + ProgressPhotos.dateOf(it) } ?: ""), style = Txt.sys.copy(color = SysColors.Hidden))
                        pair.first?.let { Image(it, label, Modifier.fillMaxWidth().aspectRatio(0.75f), contentScale = ContentScale.Crop) }
                            ?: Text("ยังไม่มีรูป", style = Txt.sub)
                    }
                }
            }
            Text("ถ่ายท่าเดิม แสงเดิม ทุก 2 สัปดาห์ · มีทั้งหมด ${files.size} รูป", style = Txt.sub)
            SystemButton("เพิ่มรูปวันนี้", SysColors.Hidden, { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, primary = false)
        }
    }
}
