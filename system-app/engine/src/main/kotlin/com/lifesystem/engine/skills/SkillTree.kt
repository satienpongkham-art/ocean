package com.lifesystem.engine.skills

import com.lifesystem.engine.model.Stat

data class Skill(val id: String, val name: String, val requirement: String, val stat: Stat)

data class SkillInput(
    val pushupMax: Int? = null,
    val plankSec: Int? = null,
    val ropeSec: Int? = null,
    val maxSteps: Int = 0,
    val wakeStreak: Int = 0,
    val readStreak: Int = 0,
    val journalStreak: Int = 0,
    val focusSessions: Int = 0,
)

/** Round 2 rule R2.8: skills from real records; each gives +5 % EXP for its stat. */
object SkillTree {
    const val BONUS_PER_SKILL = 0.05

    val all = listOf(
        Skill("iron_arms", "แขนเหล็ก", "วิดพื้นรวดเดียว 30 ครั้ง", Stat.STR),
        Skill("core_steel", "แกนกลางเหล็กกล้า", "แพลงก์ 120 วินาที", Stat.STR),
        Skill("light_feet", "เท้าเบา", "เชือกกระโดดต่อเนื่อง 5 นาที", Stat.AGI),
        Skill("wanderer", "นักเดินทาง", "เดิน 10,000 ก้าวใน 1 วัน", Stat.AGI),
        Skill("early_bird", "ผู้ตื่นเช้า", "ตื่นตามเวลา 14 วันติด", Stat.VIT),
        Skill("scholar", "นักอ่าน", "อ่านหนังสือ 14 วันติด", Stat.INT),
        Skill("clear_mind", "จิตแจ่มใส", "ไดอารี่ 14 วันติด", Stat.MND),
        Skill("deep_focus", "สมาธิลึก", "Focus Dungeon ครบ 20 รอบ", Stat.INT),
    )

    fun unlocked(i: SkillInput): Set<String> = buildSet {
        if ((i.pushupMax ?: 0) >= 30) add("iron_arms")
        if ((i.plankSec ?: 0) >= 120) add("core_steel")
        if ((i.ropeSec ?: 0) >= 300) add("light_feet")
        if (i.maxSteps >= 10_000) add("wanderer")
        if (i.wakeStreak >= 14) add("early_bird")
        if (i.readStreak >= 14) add("scholar")
        if (i.journalStreak >= 14) add("clear_mind")
        if (i.focusSessions >= 20) add("deep_focus")
    }

    fun expBonus(unlocked: Set<String>, stat: Stat): Double = all.count { it.id in unlocked && it.stat == stat } * BONUS_PER_SKILL
}
