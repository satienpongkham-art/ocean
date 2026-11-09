package com.lifesystem.app.lock

import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telecom.TelecomManager

enum class LockReason(val title: String, val text: String) {
    MORNING("ล็อกเช้า", "ทำเควสต์ตื่นตามเวลา + ชั่งน้ำหนักให้เสร็จก่อน"),
    TRAINING("ล็อกฝึก", "วิดพื้นและสควอทวันนี้ยังไม่ครบ"),
    PENALTY("ล็อกลงโทษ", "เควสต์ลงโทษยังไม่เสร็จ"),
    FOCUS("FOCUS DUNGEON", "อยู่ในดันเจี้ยนโฟกัส · กลับไปทำงานต่อ"),
}

data class LockInput(
    val pkg: String,
    val nowMs: Long,
    val nowMin: Int,
    val wakeMin: Int,
    val trainingFromMin: Int,
    val lockOn: Boolean,
    val rest: Boolean,
    val morningDone: Boolean,
    val trainingDone: Boolean,
    val penaltyPending: Boolean,
    val focusUntilMs: Long,
    val lockApps: Set<String>,
    val never: Set<String>,
)

/** Hard-mode lock decisions (round 2). Pure so the rules are unit-tested. */
object LockRules {
    const val MORNING_WINDOW_MIN = 180

    fun reason(i: LockInput): LockReason? {
        if (i.pkg in i.never) return null
        if (i.nowMs < i.focusUntilMs) return LockReason.FOCUS
        if (!i.lockOn || i.rest || i.pkg !in i.lockApps) return null
        if (i.penaltyPending) return LockReason.PENALTY
        if (i.nowMin in i.wakeMin until i.wakeMin + MORNING_WINDOW_MIN && !i.morningDone) return LockReason.MORNING
        if (i.nowMin >= i.trainingFromMin && !i.trainingDone) return LockReason.TRAINING
        return null
    }

    /** Apps that are never locked: this app, phone, SMS, launcher, system UI, settings, maps. */
    fun neverLock(ctx: Context): Set<String> {
        val pm = ctx.packageManager
        val home = pm.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName
        val dialer = runCatching { ctx.getSystemService(TelecomManager::class.java)?.defaultDialerPackage }.getOrNull()
        val sms = runCatching { Telephony.Sms.getDefaultSmsPackage(ctx) }.getOrNull()
        return setOfNotNull(
            ctx.packageName, home, dialer, sms, "com.android.systemui", "com.android.settings", "com.android.phone",
            "com.samsung.android.incallui", "com.google.android.apps.maps", "com.samsung.android.dialer", "com.google.android.dialer",
        )
    }
}

/**
 * Text-neck reminder (round 2 pick): looking down at the phone for 15 continuous minutes triggers one reminder;
 * a break of more than a minute resets the run; reminders are at least 30 minutes apart.
 */
class PostureMonitor(private val runMs: Long = 15 * 60_000L, private val breakMs: Long = 60_000L, private val cooldownMs: Long = 30 * 60_000L) {
    private var runStart: Long? = null
    private var lastDown: Long? = null
    private var lastAlert: Long? = null

    fun feed(tMs: Long, lookingDown: Boolean): Boolean {
        if (!lookingDown) {
            if (lastDown != null && tMs - lastDown!! > breakMs) { runStart = null; lastDown = null }
            return false
        }
        if (runStart == null || (lastDown != null && tMs - lastDown!! > breakMs)) runStart = tMs
        lastDown = tMs
        val alert = tMs - runStart!! >= runMs && (lastAlert == null || tMs - lastAlert!! >= cooldownMs)
        if (alert) { lastAlert = tMs; runStart = tMs }
        return alert
    }

    companion object {
        /** Phone held below eye level: screen faces up within 40° of vertical gravity. */
        fun lookingDown(gx: Float, gy: Float, gz: Float): Boolean {
            val g = kotlin.math.sqrt(gx * gx + gy * gy + gz * gz).takeIf { it > 0 } ?: return false
            val angle = Math.toDegrees(kotlin.math.acos((gz / g).toDouble().coerceIn(-1.0, 1.0)))
            return angle < 40.0
        }
    }
}
