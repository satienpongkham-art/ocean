package com.lifesystem.engine.chapters

data class Chapter(val n: Int, val title: String, val requirement: String, val text: String, val rewardG: Int, val rewardItem: String? = null)

data class ChapterProgress(
    val coreStreakMax: Int = 0,
    val level: Int = 1,
    val bossesDefeated: Int = 0,
    val gatesCleared: Int = 0,
    val daysPlayed: Int = 0,
)

/** Round 2 rule R2.11: short original story chapters unlocked by real milestones. */
object Chapters {
    val all = listOf(
        Chapter(1, "การตื่นขึ้น", "ทำ CORE ครบ 7 วันติด", "เจ็ดวันที่ไม่ยอมแพ้ System บันทึกชื่อผู้เล่นไว้ในทะเบียนผู้ตื่น เส้นทางเพิ่งเริ่มต้น และนี่คือหลักฐานว่าผู้เล่นเลือกเดินต่อ", 100),
        Chapter(2, "ประตูบานแรก", "ผ่านประตูมิติ 1 ครั้ง", "รอยแยกเปิดขึ้นกลางวันธรรมดา ผู้เล่นก้าวเข้าไปโดยไม่ลังเล และกลับออกมาพร้อมสิ่งที่ได้มาด้วยแรงของตัวเอง", 0, "EXP_SCROLL"),
        Chapter(3, "ผู้ท้าทาย", "ชนะบอสประจำสัปดาห์", "ตัวเลขไม่โกหก ร่างกายของสัปดาห์นี้แข็งแรงกว่าสัปดาห์ก่อน บอสล้มลงเพราะผู้เล่นคนเดิมไม่มีอยู่แล้ว", 200),
        Chapter(4, "เส้นทางยาว", "เล่นครบ 30 วัน", "สามสิบวันผ่านไป นิสัยเล็ก ๆ กลายเป็นเกราะ สิ่งที่เคยฝืนกลายเป็นสิ่งที่ทำโดยไม่ต้องคิด", 0, "REST_TICKET"),
        Chapter(5, "ร่างใหม่", "ถึงเลเวล 5", "เงาในกระจกเริ่มเปลี่ยน ไม่ใช่เพราะ System บอก แต่เพราะผู้เล่นทำมันทุกวัน", 300),
        Chapter(6, "ผู้ไม่หยุด", "ทำ CORE ครบ 30 วันติด", "หนึ่งเดือนเต็มโดยไม่หลุดสักวัน System ยกระดับผู้เล่นเป็นผู้ที่ไว้ใจได้", 500),
        Chapter(7, "ตัวตนใหม่", "ถึงเลเวล 10", "ประตูแห่งการเปลี่ยนอาชีพเปิดออก ผู้เล่นไม่ใช่คนเดิมที่เริ่มต้นวันแรกอีกต่อไป", 1000),
    )

    fun unlocked(p: ChapterProgress): List<Int> = buildList {
        if (p.coreStreakMax >= 7) add(1)
        if (p.gatesCleared >= 1) add(2)
        if (p.bossesDefeated >= 1) add(3)
        if (p.daysPlayed >= 30) add(4)
        if (p.level >= 5) add(5)
        if (p.coreStreakMax >= 30) add(6)
        if (p.level >= 10) add(7)
    }
}
