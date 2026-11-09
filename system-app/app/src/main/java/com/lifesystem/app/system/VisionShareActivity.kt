package com.lifesystem.app.system

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import com.lifesystem.app.SystemApp
import com.lifesystem.app.data.getSetting
import com.lifesystem.app.data.putSetting
import kotlinx.coroutines.launch
import java.io.File

/** Share target: images go to the private Vision Board folder, text/links to the vision list. */
class VisionShareActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as SystemApp
        val text = intent.getStringExtra(Intent.EXTRA_TEXT)
        @Suppress("DEPRECATION") val image = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        app.appScope.launch {
            if (image != null) saveImage(image)
            else if (!text.isNullOrBlank()) {
                val list = app.repository.getSetting("vision_texts", "")
                app.repository.putSetting("vision_texts", (list + "\n" + text.replace('\n', ' ')).trim())
            }
        }
        Toast.makeText(this, "เพิ่มลง Vision Board แล้ว", Toast.LENGTH_SHORT).show()
        finish()
    }

    private fun saveImage(uri: Uri) = runCatching {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        var s = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (s * 2) >= 1080) s *= 2
        val bmp = contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = s }) } ?: return@runCatching
        val dir = File(filesDir, "vision").apply { mkdirs() }
        File(dir, "${System.currentTimeMillis()}.jpg").outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 85, it) }
    }
}
