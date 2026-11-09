package com.lifesystem.engine.achievements

/** What the player has done, oldest day first. */
data class History(
    val doneByDay: List<Set<String>>,
    val fullClearByDay: List<Boolean>,
    val totalReps: Map<String, Int>,
    val gatesCleared: Int,
    val bossesDefeated: Int,
    val menusEaten: Int,
)

data class Title(val id: String, val name: String, val desc: String)

/** Round 1.5 rule R8: titles unlocked from real history; the equipped one gives +5 % G. */
object Achievements {
    const val TITLE_GOLD_BONUS = 0.05

    val all = listOf(
        Title("early_riser", "ผู้ตื่นก่อนรุ่งอรุณ", "ตื่นตามเวลา 7 วันติด"),
        Title("scribe", "ผู้จดบันทึก", "ไดอารี่ 7 วันติด"),
        Title("clean_blood", "เลือดใส", "ไม่มีน้ำอัดลม 14 วันติด"),
        Title("night_monk", "นักพรตรัตติกาล", "ปิดจอก่อนนอน 7 วันติด"),
        Title("iron_body", "ร่างเหล็ก", "เคลียร์เควสต์หลักครบ 7 วันติด"),
        Title("hundred_fists", "หมัดพันครั้ง", "วิดพื้นสะสม 1,000 ครั้ง"),
        Title("ten_thousand", "หมื่นวิด", "วิดพื้นสะสม 10,000 ครั้ง"),
        Title("gate_breaker", "ผู้ทำลายประตู", "ผ่านประตู 10 ครั้ง"),
        Title("boss_slayer", "ผู้ล้มบอส", "ชนะบอสประจำสัปดาห์"),
        Title("gourmet", "นักชิม", "กินเมนูต่างกัน 10 เมนู"),
    )

    fun byId(id: String): Title? = all.firstOrNull { it.id == id }

    private fun maxStreak(flags: List<Boolean>): Int {
        var best = 0; var cur = 0
        flags.forEach { if (it) { cur++; best = maxOf(best, cur) } else cur = 0 }
        return best
    }

    private fun streak(h: History, questId: String) = maxStreak(h.doneByDay.map { questId in it })

    fun unlocked(h: History): Set<String> = buildSet {
        if (streak(h, "wake") >= 7) add("early_riser")
        if (streak(h, "journal") >= 7) add("scribe")
        if (streak(h, "no_soda") >= 14) add("clean_blood")
        if (streak(h, "screen_off") >= 7) add("night_monk")
        if (maxStreak(h.fullClearByDay) >= 7) add("iron_body")
        val push = h.totalReps["pushup"] ?: 0
        if (push >= 1000) add("hundred_fists")
        if (push >= 10_000) add("ten_thousand")
        if (h.gatesCleared >= 10) add("gate_breaker")
        if (h.bossesDefeated >= 1) add("boss_slayer")
        if (h.menusEaten >= 10) add("gourmet")
    }
}
