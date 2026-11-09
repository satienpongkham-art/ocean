package com.lifesystem.engine.quest

import com.lifesystem.engine.model.Condition
import com.lifesystem.engine.model.Group
import com.lifesystem.engine.model.Inventory
import com.lifesystem.engine.model.Quest
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.QuestType.DAILY_MAIN
import com.lifesystem.engine.model.QuestType.DAILY_SIDE
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.model.Verify
import com.lifesystem.engine.training.TrainingProgram

/** Builds the daily quest board (spec §5.2). Deterministic: same inputs → same board. */
object BoardGenerator {
    const val MAX_MAINTENANCE_PER_DAY = 2
    const val FULL_CLEAR_GOLD = 10
    private const val MAIN_GOLD = 4

    fun generate(
        dayNumber: Int,
        condition: Condition,
        inventory: Inventory,
        maintenanceDue: List<String>,
        penaltyPending: Boolean,
        bossDay: Boolean = false,
    ): List<Quest> = buildList {
        fun main(id: String, title: String, stat: Stat, group: Group, verify: Verify, exp: Int, target: Int = 1, unit: String = "") =
            add(Quest(id, title, stat, DAILY_MAIN, group, verify, target, unit, exp, MAIN_GOLD))
        fun side(id: String, title: String, stat: Stat, group: Group, verify: Verify, exp: Int, gold: Int, target: Int = 1, unit: String = "") =
            add(Quest(id, title, stat, DAILY_SIDE, group, verify, target, unit, exp, gold))

        if (penaltyPending) {
            val extra = TrainingProgram.pushupTotal(dayNumber) / 2
            add(Quest("penalty", "PENALTY · วิดพื้นเพิ่ม", Stat.STR, QuestType.PENALTY, Group.TRAINING, Verify.SENSOR, extra, "ครั้ง", 0, 0))
            add(Quest("penalty_squat", "PENALTY · สควอทเพิ่ม", Stat.STR, QuestType.PENALTY, Group.TRAINING, Verify.SENSOR, 20, "ครั้ง", 0, 0))
        }

        main("wake", "ตื่นตามเวลา", Stat.VIT, Group.MORNING, Verify.AUTO, 30)
        main("weigh", "ชั่งน้ำหนัก + วัดรอบเอว", Stat.VIT, Group.MORNING, Verify.NUMBER, 20)
        if (inventory.hasSunscreen) {
            main("skincare", "แปรงฟัน · ล้างหน้า · ทากันแดด", Stat.CHA, Group.MORNING, Verify.SELF, 25)
        } else {
            add(Quest("buy_sunscreen", "ซื้อกันแดด SPF 30+ PA+++ (งบไม่เกิน 300 บาท)", Stat.CHA, QuestType.CHAIN, Group.MORNING, Verify.SELF, 1, "", 30, MAIN_GOLD))
        }

        main("no_soda", "ไม่มีน้ำอัดลมหวาน", Stat.VIT, Group.DAY, Verify.SELF, 20)
        main("read", "อ่านหนังสือ", Stat.INT, Group.DAY, Verify.SELF, 25, TrainingProgram.readingPages(dayNumber), "หน้า")
        main("english", "ภาษาอังกฤษ", Stat.INT, Group.DAY, Verify.SELF, 25, TrainingProgram.englishMinutes(dayNumber), "นาที")
        side("water", "ดื่มน้ำ", Stat.VIT, Group.DAY, Verify.NUMBER, 15, 2, 2500, "มล.")
        side("budget", "ใช้เงินไม่เกินงบวันนี้", Stat.GOLD, Group.DAY, Verify.SELF, 10, 1)

        main("posture", "แก้หลังค่อม · chin tuck + wall angel 3 เซ็ต", Stat.CHA, Group.DAY, Verify.SELF, 20)
        main("steps", "เดินให้ครบ", Stat.AGI, Group.DAY, Verify.AUTO, 30, TrainingProgram.stepsTarget(dayNumber), "ก้าว")
        side("walk_meal", "เดิน 10 นาทีหลังมื้อ", Stat.VIT, Group.DAY, Verify.SENSOR, 15, 2, 2, "รอบ")

        val push = TrainingProgram.scaled(TrainingProgram.pushupTotal(dayNumber), condition)
        val squat = TrainingProgram.scaled(TrainingProgram.squatTotal(dayNumber), condition)
        val situp = TrainingProgram.scaled(TrainingProgram.situpTotal(dayNumber), condition)
        val rope = TrainingProgram.scaled(TrainingProgram.ropeSeconds(dayNumber), condition)
        main("pushup", "วิดพื้น", Stat.STR, Group.TRAINING, Verify.SENSOR, 40, push, "ครั้ง")
        main("squat", "สควอท", Stat.STR, Group.TRAINING, Verify.SENSOR, 35, squat, "ครั้ง")
        main("situp", "ซิทอัพ", Stat.STR, Group.TRAINING, Verify.SENSOR, 35, situp, "ครั้ง")
        side("rope", "เชือกกระโดด", Stat.AGI, Group.TRAINING, Verify.SENSOR, 20, 2, rope, "วินาที")

        if (bossDay) {
            add(Quest("boss_pushup", "BOSS · วิดพื้นรวดเดียวให้มากที่สุด", Stat.STR, QuestType.BOSS, Group.TRAINING, Verify.SENSOR, 1, "เซ็ต", 0, 0))
            add(Quest("boss_plank", "BOSS · แพลงก์ให้นานที่สุด", Stat.STR, QuestType.BOSS, Group.TRAINING, Verify.NUMBER, 1, "ครั้ง", 0, 0))
        }

        side("kitchen_close", "ครัวปิด 21:00", Stat.VIT, Group.NIGHT, Verify.SELF, 10, 1)
        main("journal", "ไดอารี่ 3 บรรทัด", Stat.MND, Group.NIGHT, Verify.AUTO, 25)
        main("screen_off", "ปิดจอ 30 นาทีก่อนนอน", Stat.MND, Group.NIGHT, Verify.AUTO, 20)
        main("sleep", "เข้านอนตรงเวลา", Stat.VIT, Group.NIGHT, Verify.AUTO, 30)

        maintenanceDue.distinct().take(MAX_MAINTENANCE_PER_DAY).forEach { id ->
            add(Quest("mt_$id", "MAINTENANCE · $id", Stat.CHA, QuestType.MAINTENANCE, Group.DAY, Verify.SELF, 1, "", 15, 2))
        }
    }
}
