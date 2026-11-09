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
    /** A meal counts for "protein every meal" at this much protein (≈ 0.25–0.4 g/kg per meal). */
    const val PROTEIN_PER_MEAL_G = 20
    const val FULL_CLEAR_GOLD = 10
    private const val MAIN_GOLD = 4

    fun generate(
        dayNumber: Int,
        condition: Condition,
        inventory: Inventory,
        maintenanceDue: List<String>,
        penaltyPending: Boolean,
        bossDay: Boolean = false,
        penaltyFundBaht: Int = 0,
        dumbbellDay: Boolean = false,
    ): List<Quest> = buildList {
        fun main(id: String, title: String, stat: Stat, group: Group, verify: Verify, exp: Int, target: Int = 1, unit: String = "") =
            add(Quest(id, title, stat, DAILY_MAIN, group, verify, target, unit, exp, MAIN_GOLD))
        fun side(id: String, title: String, stat: Stat, group: Group, verify: Verify, exp: Int, gold: Int, target: Int = 1, unit: String = "") =
            add(Quest(id, title, stat, DAILY_SIDE, group, verify, target, unit, exp, gold))

        if (penaltyPending) {
            val extra = TrainingProgram.pushupTotal(dayNumber) / 2
            add(Quest("penalty", "PENALTY · วิดพื้นเพิ่ม", Stat.STR, QuestType.PENALTY, Group.TRAINING, Verify.SENSOR, extra, "ครั้ง", 0, 0))
            add(Quest("penalty_squat", "PENALTY · สควอทเพิ่ม", Stat.STR, QuestType.PENALTY, Group.TRAINING, Verify.SENSOR, 20, "ครั้ง", 0, 0))
            if (penaltyFundBaht > 0) {
                add(Quest("penalty_fund", "PENALTY · โอน $penaltyFundBaht ฿ เข้าเงินเก็บ", Stat.GOLD, QuestType.PENALTY, Group.DAY, Verify.NUMBER, 1, "฿$penaltyFundBaht", 0, 0))
            }
        }

        main("wake", "ตื่นตามเวลา", Stat.VIT, Group.MORNING, Verify.AUTO, 30)
        main("weigh", "ชั่งน้ำหนัก + วัดรอบเอว", Stat.VIT, Group.MORNING, Verify.NUMBER, 20)
        main("sunlight", "รับแดดเช้า 10 นาที (ภายใน 1 ชม. หลังตื่น)", Stat.VIT, Group.MORNING, Verify.SELF, 20)
        if (inventory.hasSunscreen) {
            main("skincare", "แปรงฟัน · ล้างหน้า · ทากันแดด", Stat.CHA, Group.MORNING, Verify.SELF, 25)
        } else {
            add(Quest("buy_sunscreen", "ซื้อกันแดด SPF 30+ PA+++ (งบไม่เกิน 300 บาท)", Stat.CHA, QuestType.CHAIN, Group.MORNING, Verify.SELF, 1, "", 30, MAIN_GOLD))
        }

        main("no_soda", "ไม่มีน้ำอัดลมหวาน", Stat.VIT, Group.DAY, Verify.SELF, 20)
        main("protein_meals", "โปรตีน ≥ ${PROTEIN_PER_MEAL_G} ก. ทุกมื้อ (บันทึกใน MEAL)", Stat.VIT, Group.DAY, Verify.AUTO, 25, 3, "มื้อ")
        main("read", "อ่านหนังสือ", Stat.INT, Group.DAY, Verify.SELF, 25, TrainingProgram.readingPages(dayNumber), "หน้า")
        main("english", "ภาษาอังกฤษ", Stat.INT, Group.DAY, Verify.SELF, 25, TrainingProgram.englishMinutes(dayNumber), "นาที")
        side("water", "ดื่มน้ำ", Stat.VIT, Group.DAY, Verify.NUMBER, 15, 2, 2500, "มล.")
        side("budget", "ใช้เงินไม่เกินงบวันนี้", Stat.GOLD, Group.DAY, Verify.SELF, 10, 1)

        main("posture", "แก้หลังค่อม · chin tuck + wall angel 3 เซ็ต", Stat.CHA, Group.DAY, Verify.SELF, 20)
        main("steps", "เดินให้ครบ", Stat.AGI, Group.DAY, Verify.AUTO, 30, TrainingProgram.stepsTarget(dayNumber), "ก้าว")
        side("walk_meal", "เดิน 10 นาทีหลังมื้อ", Stat.VIT, Group.DAY, Verify.SENSOR, 15, 2, 2, "รอบ")

        if (bossDay) {
            // Rest day (rule R2.2): recovery only, the boss measurements are the training.
            main("mobility", "ยืดเหยียด 10 นาที · วันพักฟื้นร่างกาย", Stat.AGI, Group.TRAINING, Verify.SELF, 20)
        } else {
            val push = TrainingProgram.scaled(TrainingProgram.pushupTotal(dayNumber), condition)
            val squat = TrainingProgram.scaled(TrainingProgram.squatTotal(dayNumber), condition)
            val rope = TrainingProgram.scaled(TrainingProgram.ropeSeconds(dayNumber), condition)
            main("pushup", "วิดพื้น", Stat.STR, Group.TRAINING, Verify.SENSOR, 40, push, "ครั้ง")
            main("squat", "สควอท", Stat.STR, Group.TRAINING, Verify.SENSOR, 35, squat, "ครั้ง")
            if (dayNumber % 2 == 0) {
                main("plank", "แพลงก์ (จับเวลา)", Stat.STR, Group.TRAINING, Verify.NUMBER, 35, TrainingProgram.scaled(TrainingProgram.plankSeconds(dayNumber), condition), "วินาที")
            } else {
                main("situp", "ซิทอัพ", Stat.STR, Group.TRAINING, Verify.SENSOR, 35, TrainingProgram.scaled(TrainingProgram.situpTotal(dayNumber), condition), "ครั้ง")
            }
            side("rope", "เชือกกระโดด", Stat.AGI, Group.TRAINING, Verify.SENSOR, 20, 2, rope, "วินาที")
            if (dumbbellDay) {
                val reps = TrainingProgram.dumbbellReps(dayNumber)
                listOf("db_curl" to "ดัมเบล · เคิร์ล", "db_row" to "ดัมเบล · โรว์", "db_press" to "ดัมเบล · เพรส").forEach { (id, t) ->
                    side(id, "$t 3×$reps", Stat.STR, Group.TRAINING, Verify.NUMBER, 15, 1, 3, "เซ็ต")
                }
            }
        }

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
