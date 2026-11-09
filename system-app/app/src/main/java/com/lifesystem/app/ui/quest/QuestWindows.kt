package com.lifesystem.app.ui.quest

import com.lifesystem.app.data.QuestEntity
import com.lifesystem.engine.model.QuestType

/** One QUEST INFO window on the quest page. [prop] picks the avatar's prop/aura (a stat name or "PENALTY"). */
data class WindowSpec(val key: String, val subtitle: String, val prop: String, val quests: List<QuestEntity>, val caution: String?)

/** Splits the day's board into category windows (round 1.5 quest page). Pure, so it is unit-tested. */
object QuestWindows {
    const val CAUTION = "ถ้าเควสต์ประจำวันไม่สำเร็จภายในวันนี้ จะได้รับบทลงโทษตามสมควร"

    private val categories = listOf(
        Triple("BODY", "ร่างกาย · ฝึกให้แข็งแกร่ง", setOf("STR", "AGI")),
        Triple("HEALTH", "สุขภาพ · กิน นอน ดื่ม", setOf("VIT")),
        Triple("LOOK", "ภาพลักษณ์ · ดูแลตัวเอง", setOf("CHA")),
        Triple("MIND", "จิตใจ · สงบและมีวินัย", setOf("MND")),
        Triple("WISDOM", "ปัญญา · อ่านและเรียน", setOf("INT")),
    )

    fun group(board: List<QuestEntity>, minuteOfDay: Int): List<WindowSpec> = buildList {
        val penalty = board.filter { it.type == QuestType.PENALTY.name }
        if (penalty.isNotEmpty()) add(WindowSpec("PENALTY", "PENALTY ZONE · ชดใช้เมื่อวาน", "PENALTY", penalty, "ไม่ทำวันนี้ บทลงโทษจะต่อเนื่องไปพรุ่งนี้"))

        val gates = board.filter { it.type == QuestType.GATE.name && (it.closeMin ?: 0) > minuteOfDay }
        if (gates.isNotEmpty()) add(WindowSpec("GATE", "GATE · ประตูมิติวันนี้", "AGI", gates.sortedBy { it.openMin }, "ประตูที่ไม่ผ่านภายในเวลา = บทลงโทษพรุ่งนี้"))

        val boss = board.filter { it.type == QuestType.BOSS.name }
        if (boss.isNotEmpty()) add(WindowSpec("BOSS", "BOSS ประจำสัปดาห์ · วัดผลจริง", "STR", boss, null))

        val daily = board.filter { it.type in setOf(QuestType.DAILY_MAIN.name, QuestType.CHAIN.name, QuestType.MAINTENANCE.name) }
        categories.forEach { (key, subtitle, stats) ->
            val qs = daily.filter { it.stat in stats }
            if (qs.isNotEmpty()) add(WindowSpec(key, subtitle, stats.first(), qs, CAUTION))
        }
        val side = board.filter { it.type == QuestType.DAILY_SIDE.name }
        if (side.isNotEmpty()) add(WindowSpec("SIDE", "เควสต์เสริม · ไม่บังคับ ได้ G เพิ่ม", "GOLD", side, null))
    }
}
