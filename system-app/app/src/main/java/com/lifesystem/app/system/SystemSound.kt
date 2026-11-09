package com.lifesystem.app.system

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import com.lifesystem.app.SystemApp
import com.lifesystem.app.data.Keys
import com.lifesystem.app.data.getBool
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Short System sounds; off when the user turns them off or the phone is silent. */
object SystemSound {
    enum class Kind { CLEAR, LEVEL_UP, ALERT }

    fun play(context: Context, kind: Kind) {
        val app = context.applicationContext as SystemApp
        app.appScope.launch {
            if (!app.repository.getBool(Keys.SOUND, true)) return@launch
            val am = context.getSystemService(AudioManager::class.java)
            if (am.ringerMode != AudioManager.RINGER_MODE_NORMAL) return@launch
            val tg = runCatching { ToneGenerator(AudioManager.STREAM_NOTIFICATION, 70) }.getOrNull() ?: return@launch
            val notes = when (kind) {
                Kind.CLEAR -> listOf(ToneGenerator.TONE_PROP_ACK to 120)
                Kind.LEVEL_UP -> listOf(ToneGenerator.TONE_DTMF_4 to 110, ToneGenerator.TONE_DTMF_6 to 110, ToneGenerator.TONE_DTMF_9 to 110, ToneGenerator.TONE_DTMF_D to 260)
                Kind.ALERT -> listOf(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD to 300)
            }
            notes.forEach { (tone, ms) -> tg.startTone(tone, ms); delay(ms + 40L) }
            tg.release()
        }
    }
}
