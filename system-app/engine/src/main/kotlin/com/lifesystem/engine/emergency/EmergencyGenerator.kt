package com.lifesystem.engine.emergency

import com.lifesystem.engine.gate.GateGenerator
import com.lifesystem.engine.model.Group
import com.lifesystem.engine.model.Quest
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.model.Verify
import java.time.DayOfWeek
import java.time.LocalDate
import java.util.Random

/** Round 2 rule R2.4: a surprise quest on ~40 % of non-rest days, 60–120 min to finish. */
object EmergencyGenerator {
    const val GOLD = 20
    private data class Task(val id: String, val title: String, val verify: Verify, val target: Int, val unit: String, val stat: Stat)

    private val pool = listOf(
        Task("emg_pushup", "EMERGENCY · วิดพื้นรวด", Verify.SENSOR, 30, "ครั้ง", Stat.STR),
        Task("emg_squat", "EMERGENCY · สควอทรวด", Verify.SENSOR, 50, "ครั้ง", Stat.STR),
        Task("emg_rope", "EMERGENCY · เชือกกระโดด", Verify.SENSOR, 120, "วินาที", Stat.AGI),
        Task("emg_wallsit", "EMERGENCY · นั่งพิงกำแพง (จับเวลา)", Verify.NUMBER, 60, "วินาที", Stat.STR),
    )

    fun generate(epochDay: Long, wakeMin: Int, sleepMin: Int): Quest? {
        if (LocalDate.ofEpochDay(epochDay).dayOfWeek == DayOfWeek.SUNDAY) return null
        val r = Random(GateGenerator.mixSeed(epochDay * 6007 + 3))
        if (r.nextDouble() >= 0.4) return null
        val bed = if (sleepMin <= wakeMin) sleepMin + 1440 else sleepMin
        val len = 60 + r.nextInt(61)
        val first = wakeMin + 60
        val last = minOf(bed - 120, 1439) - len
        if (last < first) return null
        val open = first + r.nextInt(last - first + 1)
        val t = pool[r.nextInt(pool.size)]
        return Quest(t.id, t.title, t.stat, QuestType.EMERGENCY, Group.DAY, t.verify, t.target, t.unit, 30, GOLD, open, open + len)
    }
}
