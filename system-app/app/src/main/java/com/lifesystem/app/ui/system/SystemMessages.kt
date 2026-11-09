package com.lifesystem.app.ui.system

import com.lifesystem.engine.model.Condition

enum class MsgLevel { ALERT, WARN, INFO }

/** One line the System says when called; [route] is where its button goes. */
data class SysMessage(val level: MsgLevel, val text: String, val route: String? = null)

/** Snapshot of the player's day used to build the System's messages. */
data class SystemState(
    val nowMin: Int,
    val requiredLeft: Int,
    val requiredTotal: Int,
    val penaltyActive: Boolean = false,
    val openGate: Pair<String, Int>? = null,
    val nextGateOpenMin: Int? = null,
    val bossDay: Boolean = false,
    val bossFought: Boolean = false,
    val expAtCap: Boolean = false,
    val condition: Condition = Condition.NORMAL,
    val sleepH: Double? = null,
    val expScrolls: Int = 0,
    val nextMealMin: Int? = null,
    val steps: Pair<Int, Int>? = null,
)

/** What the System tells the player right now, most urgent first. Pure for testing. */
object SystemMessages {
    private fun hhmm(m: Int) = "%02d:%02d".format(m / 60 % 24, m % 60)

    fun build(s: SystemState): List<SysMessage> = buildList {
        if (s.penaltyActive) add(SysMessage(MsgLevel.ALERT, "PENALTY ZONE · ทำเควสต์ลงโทษให้เสร็จก่อนเที่ยงคืน", "quests"))
        s.openGate?.let { (name, left) -> add(SysMessage(MsgLevel.ALERT, "$name เปิดอยู่ · เหลือ $left นาที", "gate")) }
        val leftMin = 24 * 60 - s.nowMin
        if (s.requiredLeft > 0) {
            val level = if (leftMin < 180) MsgLevel.WARN else MsgLevel.INFO
            add(SysMessage(level, "เควสต์บังคับเหลือ ${s.requiredLeft}/${s.requiredTotal} · เวลาเหลือ ${leftMin / 60} ชม. ${leftMin % 60} นาที", "quests"))
        } else if (s.requiredTotal > 0) {
            add(SysMessage(MsgLevel.INFO, "เควสต์ประจำวันครบแล้ว · ผู้เล่นทำได้ยอดเยี่ยม"))
        }
        if (s.bossDay && !s.bossFought) add(SysMessage(MsgLevel.WARN, "วันนี้บอสประจำสัปดาห์ปรากฏ · วัดผลแล้วท้าสู้ได้", "gate"))
        if (s.expAtCap) add(SysMessage(MsgLevel.WARN, "[ LIMIT ] EXP เต็ม · ต้องชนะบอสวันอาทิตย์จึงจะเลเวลขึ้น", "gate"))
        if (s.sleepH != null && s.condition == Condition.FATIGUED) add(SysMessage(MsgLevel.WARN, "นอนเมื่อคืน %.1f ชม. · CONDITION FATIGUED เป้าฝึกลด 30%% คืนนี้นอนให้ครบ".format(s.sleepH)))
        s.steps?.let { (have, need) -> if (have < need && s.nowMin >= 18 * 60) add(SysMessage(MsgLevel.WARN, "ก้าวยังขาด ${need - have} ก้าว · เดินในบ้านก่อนนอน", "quests")) }
        if (s.condition == Condition.OPTIMAL) add(SysMessage(MsgLevel.INFO, "CONDITION OPTIMAL · วันนี้ได้ EXP +10%"))
        s.nextGateOpenMin?.let { if (s.openGate == null) add(SysMessage(MsgLevel.INFO, "ประตูถัดไปเปิด ${hhmm(it)} · เตรียมตัวให้พร้อม", "gate")) }
        s.nextMealMin?.let { if (it - s.nowMin in 0..90) add(SysMessage(MsgLevel.INFO, "มื้อถัดไป ${hhmm(it)} · ดูเมนูที่ System จัดไว้", "meal")) }
        if (s.expScrolls > 0) add(SysMessage(MsgLevel.INFO, "มีม้วน EXP ×2 อยู่ ${s.expScrolls} ม้วน · ใช้ได้ที่ STATUS", "status"))
    }.sortedBy { it.level.ordinal }
}
